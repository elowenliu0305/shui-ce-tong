begin;

create table public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  current_enterprise_id uuid,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint account_preferences_is_object check (jsonb_typeof(preferences) = 'object')
);

create table public.enterprises (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  region_province text not null check (length(btrim(region_province)) between 1 and 50),
  region_city text not null check (length(btrim(region_city)) between 1 and 50),
  industry text not null check (length(btrim(industry)) between 1 and 100),
  revision integer not null default 1 check (revision > 0),
  deletion_state text not null default 'active'
    check (deletion_state in ('active', 'revoked', 'purging', 'failed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, owner_id)
);

alter table public.account_profiles
  add constraint account_profiles_current_enterprise_fk
  foreign key (current_enterprise_id) references public.enterprises(id) on delete set null;

create table public.deletion_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  resource_type text not null check (resource_type in ('enterprise', 'enterprise_file')),
  resource_id uuid not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  storage_keys text[] not null default '{}',
  result_summary jsonb not null default '{}'::jsonb,
  last_error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  unique (resource_type, resource_id),
  constraint deletion_summary_is_object check (jsonb_typeof(result_summary) = 'object')
);

create index enterprises_owner_active_idx
  on public.enterprises (owner_id, updated_at desc)
  where deletion_state = 'active';
create index deletion_jobs_status_idx on public.deletion_jobs (status, created_at);

create trigger account_profiles_set_updated_at
before update on public.account_profiles
for each row execute function private.set_updated_at();

create trigger enterprises_set_updated_at
before update on public.enterprises
for each row execute function private.set_updated_at();

create trigger deletion_jobs_set_updated_at
before update on public.deletion_jobs
for each row execute function private.set_updated_at();

create or replace function private.create_account_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger auth_user_created_profile
after insert on auth.users
for each row execute function private.create_account_profile();

insert into public.account_profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

revoke all on function private.create_account_profile() from public, anon, authenticated;

commit;
