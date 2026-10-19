begin;
select plan(23);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '50000000-0000-0000-0000-000000000005',
  'authenticated', 'authenticated', 'assessment@example.com', 'test', now(), '{}', '{}', now(), now()
);

insert into public.enterprises (id, owner_id, name, region_province, region_city, industry)
values (
  '51000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000005',
  '评测事务企业', '浙江省', '杭州市', '软件业'
);

select tests.authenticate_as('50000000-0000-0000-0000-000000000005');

select lives_ok(
  $$ select public.save_company_profile_draft(
    '51000000-0000-0000-0000-000000000001', 0, '{}'::jsonb, 0,
    '52000000-0000-0000-0000-000000000001'
  ) $$,
  'profile draft can be created'
);
select lives_ok(
  $$ select public.save_company_profile_draft(
    '51000000-0000-0000-0000-000000000001', 0, '{}'::jsonb, 0,
    '52000000-0000-0000-0000-000000000001'
  ) $$,
  'profile mutation can be replayed'
);
select is((select count(*) from public.company_profile_drafts), 1::bigint, 'profile replay does not duplicate rows');
select is((select revision from public.company_profile_drafts), 1, 'profile replay does not increment revision');
select throws_ok(
  $$ select public.save_company_profile_draft(
    '51000000-0000-0000-0000-000000000001', 0, '{"changed":true}'::jsonb, 0,
    '52000000-0000-0000-0000-000000000002'
  ) $$,
  '40001', 'conflict', 'stale profile revision is rejected'
);

select lives_ok(
  $$ select public.save_questionnaire_draft(
    '51000000-0000-0000-0000-000000000001', 0,
    'a0000000-0000-0000-0000-000000000002',
    (select jsonb_object_agg(question->>'id', question->'options'->0->>'id')
     from public.question_set_releases,
     lateral jsonb_array_elements(questions) question
     where id = 'a0000000-0000-0000-0000-000000000002'),
    '53000000-0000-0000-0000-000000000001'
  ) $$,
  'questionnaire draft can be created'
);
select lives_ok(
  $$ select public.save_questionnaire_draft(
    '51000000-0000-0000-0000-000000000001', 0,
    'a0000000-0000-0000-0000-000000000002',
    (select jsonb_object_agg(question->>'id', question->'options'->0->>'id')
     from public.question_set_releases,
     lateral jsonb_array_elements(questions) question
     where id = 'a0000000-0000-0000-0000-000000000002'),
    '53000000-0000-0000-0000-000000000001'
  ) $$,
  'questionnaire mutation can be replayed'
);
select is((select count(*) from public.questionnaire_drafts), 1::bigint, 'questionnaire replay does not duplicate rows');
select is((select revision from public.questionnaire_drafts), 1, 'questionnaire replay does not increment revision');

select lives_ok(
  $$ select public.begin_assessment_submission(
    '51000000-0000-0000-0000-000000000001', 1, 1, '2026-10-19',
    'assessment-retry-key-0001'
  ) $$,
  'assessment submission freezes current revisions'
);
select lives_ok(
  $$ select public.begin_assessment_submission(
    '51000000-0000-0000-0000-000000000001', 1, 1, '2026-10-19',
    'assessment-retry-key-0001'
  ) $$,
  'assessment submission replay returns the existing row'
);
select is((select count(*) from public.assessment_submissions), 1::bigint, 'submission replay creates one row');
select throws_ok(
  $$ select public.begin_assessment_submission(
    '51000000-0000-0000-0000-000000000001', 1, 1, '2026-10-20',
    'assessment-retry-key-0001'
  ) $$,
  '23505', 'idempotency_mismatch', 'same idempotency key cannot change its request'
);

reset role;

create or replace function tests.force_report_failure()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = 'forced_report_failure';
end;
$$;
create trigger force_report_failure before insert on public.report_snapshots
for each row execute function tests.force_report_failure();

select throws_ok(
  $$ select public.finalize_assessment_submission(
    (select id from public.assessment_submissions limit 1),
    (select input_hash from public.assessment_submissions limit 1),
    '{"riskSummary":{"level":"low"}}'::jsonb,
    '{"versions":{"engine":"test","ruleSet":"test","catalog":"test"}}'::jsonb,
    'result-hash-1'
  ) $$,
  'P0001', 'forced_report_failure', 'report failure rolls back the whole finalize transaction'
);
select is((select count(*) from public.assessment_runs), 0::bigint, 'failed finalize leaves no run');
select is((select status from public.assessment_submissions limit 1), 'started', 'failed finalize leaves submission retryable');

drop trigger force_report_failure on public.report_snapshots;

select lives_ok(
  $$ select public.finalize_assessment_submission(
    (select id from public.assessment_submissions limit 1),
    (select input_hash from public.assessment_submissions limit 1),
    '{"riskSummary":{"level":"low"}}'::jsonb,
    '{"versions":{"engine":"test","ruleSet":"test","catalog":"test"}}'::jsonb,
    'result-hash-1'
  ) $$,
  'retry finalizes the report successfully'
);
select lives_ok(
  $$ select public.finalize_assessment_submission(
    (select id from public.assessment_submissions limit 1),
    (select input_hash from public.assessment_submissions limit 1),
    '{"riskSummary":{"level":"low"}}'::jsonb,
    '{"versions":{"engine":"test","ruleSet":"test","catalog":"test"}}'::jsonb,
    'result-hash-1'
  ) $$,
  'completed finalize can be safely replayed'
);
select is((select count(*) from public.assessment_runs), 1::bigint, 'finalize replay creates one run');
select is((select count(*) from public.report_snapshots), 1::bigint, 'finalize replay creates one report');
select is((select status from public.assessment_submissions limit 1), 'completed', 'successful finalize marks submission completed');
select throws_ok(
  $$ update public.report_snapshots set report = '{"forged":true}'::jsonb $$,
  '55000', 'immutable_record', 'report snapshots cannot be updated'
);
select throws_ok(
  $$ delete from public.report_snapshots $$,
  '55000', 'immutable_record', 'report snapshots cannot be directly deleted while enterprise exists'
);

select * from finish();
rollback;
