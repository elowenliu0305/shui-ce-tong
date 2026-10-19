begin;

create table public.audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  enterprise_id uuid,
  event_type text not null check (length(event_type) between 1 and 100),
  resource_type text not null check (length(resource_type) between 1 and 100),
  resource_id uuid,
  request_id uuid not null default extensions.gen_random_uuid(),
  before_hash text,
  after_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint audit_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_events_owner_created_idx on public.audit_events (owner_id, created_at desc);
create index audit_events_resource_idx on public.audit_events (resource_type, resource_id, created_at desc);

alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;
revoke all on public.audit_events from anon, authenticated;
grant select, insert on public.audit_events to service_role;

create table public.client_mutations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  resource_type text not null check (length(resource_type) between 1 and 100),
  resource_id uuid,
  request_hash text not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (owner_id, mutation_id),
  constraint mutation_result_is_object check (jsonb_typeof(result) = 'object')
);

create index client_mutations_created_idx on public.client_mutations (created_at);

alter table public.client_mutations enable row level security;
alter table public.client_mutations force row level security;
revoke all on public.client_mutations from anon, authenticated;
grant select, insert, update, delete on public.client_mutations to service_role;

create or replace function private.append_audit_event(
  p_actor_user_id uuid,
  p_owner_id uuid,
  p_enterprise_id uuid,
  p_event_type text,
  p_resource_type text,
  p_resource_id uuid,
  p_request_id uuid,
  p_before_hash text default null,
  p_after_hash text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_metadata::text ~* '(password|secret|token|authorization|private.?key)' then
    raise exception using errcode = '22023', message = 'audit metadata contains a forbidden key';
  end if;

  insert into public.audit_events (
    actor_user_id, owner_id, enterprise_id, event_type, resource_type,
    resource_id, request_id, before_hash, after_hash, metadata
  ) values (
    p_actor_user_id, p_owner_id, p_enterprise_id, p_event_type, p_resource_type,
    p_resource_id, coalesce(p_request_id, extensions.gen_random_uuid()),
    p_before_hash, p_after_hash, coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function private.append_audit_event(uuid, uuid, uuid, text, text, uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function private.append_audit_event(uuid, uuid, uuid, text, text, uuid, uuid, text, text, jsonb)
  to service_role;

commit;
