begin;

alter table public.assessment_engine_releases enable row level security;
alter table public.question_set_releases enable row level security;
alter table public.policy_rule_releases enable row level security;
alter table public.catalog_releases enable row level security;
alter table public.company_profile_drafts enable row level security;
alter table public.questionnaire_drafts enable row level security;
alter table public.assessment_submissions enable row level security;
alter table public.assessment_runs enable row level security;
alter table public.report_snapshots enable row level security;
alter table public.report_citations enable row level security;

alter table public.company_profile_drafts force row level security;
alter table public.questionnaire_drafts force row level security;
alter table public.assessment_submissions force row level security;
alter table public.assessment_runs force row level security;
alter table public.report_snapshots force row level security;
alter table public.report_citations force row level security;

revoke all on public.assessment_engine_releases, public.question_set_releases,
  public.policy_rule_releases, public.catalog_releases, public.company_profile_drafts,
  public.questionnaire_drafts, public.assessment_submissions, public.assessment_runs,
  public.report_snapshots, public.report_citations from anon, authenticated;

grant select on public.assessment_engine_releases, public.question_set_releases,
  public.policy_rule_releases, public.catalog_releases, public.company_profile_drafts,
  public.questionnaire_drafts, public.assessment_submissions, public.assessment_runs,
  public.report_snapshots, public.report_citations to authenticated;

create policy active_engine_releases_read on public.assessment_engine_releases
for select to authenticated using (status in ('active', 'retired'));
create policy active_question_releases_read on public.question_set_releases
for select to authenticated using (status in ('active', 'retired'));
create policy verified_policy_releases_read on public.policy_rule_releases
for select to authenticated using (status in ('active', 'retired') and review_status = 'verified');
create policy active_catalog_releases_read on public.catalog_releases
for select to authenticated using (status in ('active', 'retired'));

create policy profile_drafts_select_own on public.company_profile_drafts
for select to authenticated using (owner_id = auth.uid());
create policy questionnaire_drafts_select_own on public.questionnaire_drafts
for select to authenticated using (owner_id = auth.uid());
create policy submissions_select_own on public.assessment_submissions
for select to authenticated using (owner_id = auth.uid());
create policy assessment_runs_select_own on public.assessment_runs
for select to authenticated using (owner_id = auth.uid());
create policy report_snapshots_select_own on public.report_snapshots
for select to authenticated using (owner_id = auth.uid());
create policy report_citations_select_own on public.report_citations
for select to authenticated using (
  exists (select 1 from public.report_snapshots r where r.id = report_id and r.owner_id = auth.uid())
);

create or replace function public.save_company_profile_draft(
  p_enterprise_id uuid,
  p_expected_revision integer,
  p_answers jsonb,
  p_completion_percent integer,
  p_mutation_id uuid
)
returns public.company_profile_drafts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_authenticated_user();
  v_request_hash text;
  v_existing public.client_mutations%rowtype;
  v_draft public.company_profile_drafts%rowtype;
begin
  if p_expected_revision < 0 or p_mutation_id is null or jsonb_typeof(p_answers) <> 'object'
     or p_completion_percent not between 0 and 100 then
    raise exception using errcode = '22023', message = 'validation_failed';
  end if;
  if not exists (select 1 from public.enterprises where id = p_enterprise_id and owner_id = v_user_id and deletion_state = 'active') then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;

  v_request_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'enterpriseId', p_enterprise_id,
    'expectedRevision', p_expected_revision,
    'answers', p_answers,
    'completionPercent', p_completion_percent
  )::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing from public.client_mutations
  where owner_id = v_user_id and mutation_id = p_mutation_id;
  if found then
    if v_existing.resource_type <> 'assessment.profile.save' or v_existing.request_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'idempotency_mismatch';
    end if;
    select * into v_draft
    from jsonb_populate_record(null::public.company_profile_drafts, v_existing.result);
    return v_draft;
  end if;

  if p_expected_revision = 0 then
    insert into public.company_profile_drafts (owner_id, enterprise_id, answers, completion_percent)
    values (v_user_id, p_enterprise_id, p_answers, p_completion_percent)
    on conflict (enterprise_id) do nothing
    returning * into v_draft;
  else
    update public.company_profile_drafts
    set answers = p_answers, completion_percent = p_completion_percent, revision = revision + 1
    where enterprise_id = p_enterprise_id and owner_id = v_user_id and revision = p_expected_revision
    returning * into v_draft;
  end if;

  if v_draft.id is null then
    raise exception using errcode = '40001', message = 'conflict';
  end if;
  insert into public.client_mutations (owner_id, mutation_id, resource_type, resource_id, request_hash, result)
  values (v_user_id, p_mutation_id, 'assessment.profile.save', v_draft.id, v_request_hash, to_jsonb(v_draft));
  return v_draft;
end;
$$;

create or replace function public.save_questionnaire_draft(
  p_enterprise_id uuid,
  p_expected_revision integer,
  p_question_set_release_id uuid,
  p_answers jsonb,
  p_mutation_id uuid
)
returns public.questionnaire_drafts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_authenticated_user();
  v_request_hash text;
  v_existing public.client_mutations%rowtype;
  v_draft public.questionnaire_drafts%rowtype;
begin
  if p_expected_revision < 0 or p_mutation_id is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception using errcode = '22023', message = 'validation_failed';
  end if;
  if not exists (select 1 from public.enterprises where id = p_enterprise_id and owner_id = v_user_id and deletion_state = 'active') then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  if not exists (select 1 from public.question_set_releases where id = p_question_set_release_id and status = 'active') then
    raise exception using errcode = '22023', message = 'invalid_question_release';
  end if;

  v_request_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'enterpriseId', p_enterprise_id,
    'expectedRevision', p_expected_revision,
    'questionSetReleaseId', p_question_set_release_id,
    'answers', p_answers
  )::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing from public.client_mutations
  where owner_id = v_user_id and mutation_id = p_mutation_id;
  if found then
    if v_existing.resource_type <> 'assessment.questionnaire.save' or v_existing.request_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'idempotency_mismatch';
    end if;
    select * into v_draft
    from jsonb_populate_record(null::public.questionnaire_drafts, v_existing.result);
    return v_draft;
  end if;

  if p_expected_revision = 0 then
    insert into public.questionnaire_drafts (owner_id, enterprise_id, question_set_release_id, answers)
    values (v_user_id, p_enterprise_id, p_question_set_release_id, p_answers)
    on conflict (enterprise_id) do nothing
    returning * into v_draft;
  else
    update public.questionnaire_drafts
    set question_set_release_id = p_question_set_release_id, answers = p_answers, revision = revision + 1
    where enterprise_id = p_enterprise_id and owner_id = v_user_id and revision = p_expected_revision
    returning * into v_draft;
  end if;

  if v_draft.id is null then
    raise exception using errcode = '40001', message = 'conflict';
  end if;
  insert into public.client_mutations (owner_id, mutation_id, resource_type, resource_id, request_hash, result)
  values (v_user_id, p_mutation_id, 'assessment.questionnaire.save', v_draft.id, v_request_hash, to_jsonb(v_draft));
  return v_draft;
end;
$$;

create or replace function public.begin_assessment_submission(
  p_enterprise_id uuid,
  p_profile_revision integer,
  p_questionnaire_revision integer,
  p_as_of_date date,
  p_idempotency_key text
)
returns public.assessment_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_authenticated_user();
  v_profile public.company_profile_drafts%rowtype;
  v_questionnaire public.questionnaire_drafts%rowtype;
  v_question_set public.question_set_releases%rowtype;
  v_catalog public.catalog_releases%rowtype;
  v_enterprise public.enterprises%rowtype;
  v_snapshot jsonb;
  v_request_hash text;
  v_input_hash text;
  v_submission public.assessment_submissions%rowtype;
  v_answers_valid boolean;
begin
  if length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'validation_failed';
  end if;

  select * into v_enterprise from public.enterprises
  where id = p_enterprise_id and owner_id = v_user_id and deletion_state = 'active';
  if not found then raise exception using errcode = 'P0002', message = 'not_found'; end if;

  select * into v_profile from public.company_profile_drafts
  where enterprise_id = p_enterprise_id and owner_id = v_user_id and revision = p_profile_revision;
  if not found then raise exception using errcode = '40001', message = 'profile_conflict'; end if;

  select * into v_questionnaire from public.questionnaire_drafts
  where enterprise_id = p_enterprise_id and owner_id = v_user_id and revision = p_questionnaire_revision;
  if not found then raise exception using errcode = '40001', message = 'questionnaire_conflict'; end if;

  select * into v_question_set from public.question_set_releases where id = v_questionnaire.question_set_release_id;
  select coalesce(bool_and(
    exists (
      select 1 from jsonb_array_elements(v_question_set.questions) q
      where q->>'id' = answer.key
        and exists (select 1 from jsonb_array_elements(q->'options') option where option->>'id' = answer.value)
    )
  ), false) into v_answers_valid
  from jsonb_each_text(v_questionnaire.answers) answer;

  if coalesce((select count(*) from jsonb_object_keys(v_questionnaire.answers)), 0) <> 10 or not v_answers_valid then
    raise exception using errcode = '22023', message = 'questionnaire_incomplete';
  end if;

  select * into v_catalog from public.catalog_releases where status = 'active';
  if not found then raise exception using errcode = '55000', message = 'no_active_catalog'; end if;

  v_snapshot := jsonb_build_object(
    'enterprise', jsonb_build_object(
      'id', v_enterprise.id, 'accountId', v_enterprise.owner_id, 'name', v_enterprise.name,
      'regionProvince', v_enterprise.region_province, 'regionCity', v_enterprise.region_city,
      'industry', v_enterprise.industry, 'revision', v_enterprise.revision,
      'createdAt', v_enterprise.created_at, 'updatedAt', v_enterprise.updated_at
    ),
    'profile', jsonb_build_object(
      'id', v_profile.id, 'enterpriseId', v_profile.enterprise_id, 'schemaVersion', v_profile.schema_version,
      'fields', v_profile.answers, 'completionPercent', v_profile.completion_percent, 'updatedAt', v_profile.updated_at
    ),
    'questionnaire', jsonb_build_object(
      'id', v_questionnaire.id, 'enterpriseId', v_questionnaire.enterprise_id,
      'answersByQuestionId', v_questionnaire.answers, 'updatedAt', v_questionnaire.updated_at
    )
  );
  v_input_hash := encode(extensions.digest(convert_to(v_snapshot::text, 'UTF8'), 'sha256'), 'hex');
  v_request_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'enterpriseId', p_enterprise_id, 'profileRevision', p_profile_revision,
    'questionnaireRevision', p_questionnaire_revision, 'asOfDate', p_as_of_date
  )::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_submission from public.assessment_submissions
  where actor_user_id = v_user_id and enterprise_id = p_enterprise_id and idempotency_key = p_idempotency_key;
  if found then
    if v_submission.request_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'idempotency_mismatch';
    end if;
    return v_submission;
  end if;

  insert into public.assessment_submissions (
    actor_user_id, owner_id, enterprise_id, idempotency_key, request_hash,
    profile_revision, questionnaire_revision, as_of_date, catalog_release_id,
    input_snapshot, input_hash
  ) values (
    v_user_id, v_user_id, p_enterprise_id, p_idempotency_key, v_request_hash,
    p_profile_revision, p_questionnaire_revision, p_as_of_date, v_catalog.id,
    v_snapshot, v_input_hash
  ) returning * into v_submission;
  return v_submission;
end;
$$;

create or replace function public.finalize_assessment_submission(
  p_submission_id uuid,
  p_expected_input_hash text,
  p_computed_result jsonb,
  p_report_snapshot jsonb,
  p_result_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.assessment_submissions%rowtype;
  v_run_id uuid := extensions.gen_random_uuid();
  v_report_id uuid := extensions.gen_random_uuid();
  v_report jsonb;
begin
  select * into v_submission from public.assessment_submissions where id = p_submission_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'not_found'; end if;
  if v_submission.input_hash <> p_expected_input_hash then
    raise exception using errcode = '22000', message = 'input_hash_mismatch';
  end if;
  if v_submission.status = 'completed' then
    select id into v_report_id from public.report_snapshots where assessment_run_id = v_submission.result_run_id;
    return jsonb_build_object('submissionId', v_submission.id, 'runId', v_submission.result_run_id, 'reportId', v_report_id, 'status', 'completed', 'replayed', true);
  end if;
  if v_submission.status <> 'started' then
    raise exception using errcode = '55000', message = 'submission_not_finalizable';
  end if;
  if jsonb_typeof(p_computed_result) <> 'object' or jsonb_typeof(p_report_snapshot) <> 'object' then
    raise exception using errcode = '22023', message = 'validation_failed';
  end if;

  insert into public.assessment_runs (
    id, submission_id, owner_id, enterprise_id, catalog_release_id,
    input_snapshot, input_hash, result, result_hash
  ) values (
    v_run_id, v_submission.id, v_submission.owner_id, v_submission.enterprise_id,
    v_submission.catalog_release_id, v_submission.input_snapshot, v_submission.input_hash,
    p_computed_result, p_result_hash
  );

  v_report := p_report_snapshot || jsonb_build_object(
    'id', v_report_id, 'assessmentRunId', v_run_id, 'enterpriseId', v_submission.enterprise_id
  );
  insert into public.report_snapshots (
    id, assessment_run_id, owner_id, enterprise_id, report, content_hash
  ) values (
    v_report_id, v_run_id, v_submission.owner_id, v_submission.enterprise_id,
    v_report, encode(extensions.digest(convert_to(v_report::text, 'UTF8'), 'sha256'), 'hex')
  );

  update public.assessment_submissions
  set status = 'completed', result_run_id = v_run_id, completed_at = timezone('utc', now())
  where id = v_submission.id;

  perform private.append_audit_event(
    v_submission.actor_user_id, v_submission.owner_id, v_submission.enterprise_id,
    'assessment.completed', 'assessment_run', v_run_id, extensions.gen_random_uuid(),
    v_submission.input_hash, p_result_hash,
    jsonb_build_object('catalogReleaseId', v_submission.catalog_release_id, 'reportId', v_report_id)
  );

  return jsonb_build_object('submissionId', v_submission.id, 'runId', v_run_id, 'reportId', v_report_id, 'status', 'completed', 'replayed', false);
end;
$$;

revoke all on function public.save_company_profile_draft(uuid, integer, jsonb, integer, uuid) from public, anon;
revoke all on function public.save_questionnaire_draft(uuid, integer, uuid, jsonb, uuid) from public, anon;
revoke all on function public.begin_assessment_submission(uuid, integer, integer, date, text) from public, anon;
revoke all on function public.finalize_assessment_submission(uuid, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.save_company_profile_draft(uuid, integer, jsonb, integer, uuid) to authenticated;
grant execute on function public.save_questionnaire_draft(uuid, integer, uuid, jsonb, uuid) to authenticated;
grant execute on function public.begin_assessment_submission(uuid, integer, integer, date, text) to authenticated;
grant execute on function public.finalize_assessment_submission(uuid, text, jsonb, jsonb, text) to service_role;

create trigger report_citations_immutable before update or delete on public.report_citations
for each row execute function private.reject_immutable_change();

commit;
