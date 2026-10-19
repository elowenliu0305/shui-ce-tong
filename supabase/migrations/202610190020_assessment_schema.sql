begin;

create table public.assessment_engine_releases (
  id uuid primary key default extensions.gen_random_uuid(),
  version text not null unique,
  content_hash text not null unique,
  manifest jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  activated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint engine_manifest_is_object check (jsonb_typeof(manifest) = 'object')
);

create table public.question_set_releases (
  id uuid primary key default extensions.gen_random_uuid(),
  version text not null unique,
  content_hash text not null unique,
  questions jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  activated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint question_set_has_ten check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = 10)
);

create table public.policy_rule_releases (
  id uuid primary key default extensions.gen_random_uuid(),
  knowledge_document_version_id uuid,
  version text not null,
  policy_version_key text not null,
  title text not null,
  content_hash text not null unique,
  effective_from date,
  effective_to date,
  eligibility jsonb not null,
  formula jsonb,
  required_fields text[] not null default '{}',
  exclusion_group text,
  overlap_priority integer not null default 0,
  citation jsonb not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'verified', 'rejected')),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  activated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (policy_version_key, version),
  constraint policy_eligibility_is_array check (jsonb_typeof(eligibility) = 'array'),
  constraint policy_citation_is_object check (jsonb_typeof(citation) = 'object'),
  constraint policy_effective_range check (effective_to is null or effective_from is null or effective_to >= effective_from)
);

create table public.catalog_releases (
  id uuid primary key default extensions.gen_random_uuid(),
  version text not null unique,
  content_hash text not null unique,
  engine_release_id uuid not null references public.assessment_engine_releases(id),
  question_set_release_id uuid not null references public.question_set_releases(id),
  policy_rule_ids uuid[] not null default '{}',
  knowledge_generation_id uuid,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  activated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index one_active_catalog_release on public.catalog_releases ((status)) where status = 'active';

create table public.company_profile_drafts (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  enterprise_id uuid not null,
  schema_version integer not null default 2 check (schema_version = 2),
  answers jsonb not null default '{}'::jsonb,
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (enterprise_id),
  foreign key (enterprise_id, owner_id) references public.enterprises(id, owner_id) on delete cascade,
  constraint profile_answers_is_object check (jsonb_typeof(answers) = 'object')
);

create table public.questionnaire_drafts (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  enterprise_id uuid not null,
  question_set_release_id uuid not null references public.question_set_releases(id),
  answers jsonb not null default '{}'::jsonb,
  verification_items jsonb not null default '[]'::jsonb,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (enterprise_id),
  foreign key (enterprise_id, owner_id) references public.enterprises(id, owner_id) on delete cascade,
  constraint questionnaire_answers_is_object check (jsonb_typeof(answers) = 'object'),
  constraint verification_items_is_array check (jsonb_typeof(verification_items) = 'array')
);

create table public.assessment_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id),
  owner_id uuid not null references auth.users(id) on delete cascade,
  enterprise_id uuid not null,
  idempotency_key text not null check (length(idempotency_key) between 16 and 128),
  request_hash text not null,
  profile_revision integer not null,
  questionnaire_revision integer not null,
  as_of_date date not null,
  catalog_release_id uuid not null references public.catalog_releases(id),
  input_snapshot jsonb not null,
  input_hash text not null,
  status text not null default 'started' check (status in ('started', 'completed', 'failed')),
  result_run_id uuid,
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  unique (actor_user_id, enterprise_id, idempotency_key),
  foreign key (enterprise_id, owner_id) references public.enterprises(id, owner_id) on delete cascade,
  constraint submission_input_is_object check (jsonb_typeof(input_snapshot) = 'object')
);

create table public.assessment_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null unique references public.assessment_submissions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  enterprise_id uuid not null,
  catalog_release_id uuid not null references public.catalog_releases(id),
  input_snapshot jsonb not null,
  input_hash text not null,
  result jsonb not null,
  result_hash text not null,
  completed_at timestamptz not null default timezone('utc', now()),
  foreign key (enterprise_id, owner_id) references public.enterprises(id, owner_id) on delete cascade,
  constraint run_input_is_object check (jsonb_typeof(input_snapshot) = 'object'),
  constraint run_result_is_object check (jsonb_typeof(result) = 'object')
);

create table public.report_snapshots (
  id uuid primary key default extensions.gen_random_uuid(),
  assessment_run_id uuid not null unique references public.assessment_runs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  enterprise_id uuid not null,
  report jsonb not null,
  content_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (enterprise_id, owner_id) references public.enterprises(id, owner_id) on delete cascade,
  constraint report_snapshot_is_object check (jsonb_typeof(report) = 'object')
);

alter table public.assessment_submissions
  add constraint assessment_submissions_result_run_fk
  foreign key (result_run_id) references public.assessment_runs(id)
  deferrable initially deferred;

create table public.report_citations (
  report_id uuid not null references public.report_snapshots(id) on delete cascade,
  citation_id uuid not null default extensions.gen_random_uuid(),
  document_version_id uuid,
  chunk_id uuid,
  rank integer not null check (rank > 0),
  locator jsonb not null,
  excerpt text,
  primary key (report_id, citation_id),
  constraint report_locator_is_object check (jsonb_typeof(locator) = 'object')
);

create index profile_drafts_owner_enterprise_idx on public.company_profile_drafts (owner_id, enterprise_id);
create index questionnaire_drafts_owner_enterprise_idx on public.questionnaire_drafts (owner_id, enterprise_id);
create index assessment_submissions_owner_created_idx on public.assessment_submissions (owner_id, enterprise_id, created_at desc);
create index assessment_runs_owner_completed_idx on public.assessment_runs (owner_id, enterprise_id, completed_at desc);
create index report_snapshots_owner_created_idx on public.report_snapshots (owner_id, enterprise_id, created_at desc);

create trigger company_profile_drafts_set_updated_at before update on public.company_profile_drafts
for each row execute function private.set_updated_at();
create trigger questionnaire_drafts_set_updated_at before update on public.questionnaire_drafts
for each row execute function private.set_updated_at();

create or replace function private.reject_immutable_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if to_jsonb(old) ? 'enterprise_id'
      and not exists (
        select 1 from public.enterprises
        where id = (to_jsonb(old)->>'enterprise_id')::uuid
      ) then
      return old;
    end if;
    if to_jsonb(old) ? 'report_id'
      and not exists (
        select 1 from public.report_snapshots
        where id = (to_jsonb(old)->>'report_id')::uuid
      ) then
      return old;
    end if;
  end if;
  raise exception using errcode = '55000', message = 'immutable_record';
end;
$$;

create or replace function private.reject_finalized_release_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('active', 'retired') then
    raise exception using errcode = '55000', message = 'immutable_release';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.reject_completed_submission_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'completed' then
    if tg_op = 'DELETE'
      and not exists (select 1 from public.enterprises where id = old.enterprise_id) then
      return old;
    end if;
    raise exception using errcode = '55000', message = 'immutable_submission';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger engine_release_immutable before update or delete on public.assessment_engine_releases
for each row execute function private.reject_finalized_release_change();
create trigger question_release_immutable before update or delete on public.question_set_releases
for each row execute function private.reject_finalized_release_change();
create trigger policy_release_immutable before update or delete on public.policy_rule_releases
for each row execute function private.reject_finalized_release_change();
create trigger catalog_release_immutable before update or delete on public.catalog_releases
for each row execute function private.reject_finalized_release_change();
create trigger submission_completed_immutable before update or delete on public.assessment_submissions
for each row execute function private.reject_completed_submission_change();
create trigger assessment_runs_immutable before update or delete on public.assessment_runs
for each row execute function private.reject_immutable_change();
create trigger report_snapshots_immutable before update or delete on public.report_snapshots
for each row execute function private.reject_immutable_change();

revoke all on function private.reject_immutable_change() from public, anon, authenticated;
revoke all on function private.reject_finalized_release_change() from public, anon, authenticated;
revoke all on function private.reject_completed_submission_change() from public, anon, authenticated;

commit;
