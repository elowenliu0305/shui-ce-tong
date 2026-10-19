begin;

alter table public.account_profiles enable row level security;
alter table public.account_profiles force row level security;
alter table public.enterprises enable row level security;
alter table public.enterprises force row level security;
alter table public.deletion_jobs enable row level security;
alter table public.deletion_jobs force row level security;

revoke all on public.account_profiles, public.enterprises, public.deletion_jobs from anon, authenticated;
grant select on public.account_profiles, public.enterprises to authenticated;

create policy account_profiles_select_own
on public.account_profiles for select to authenticated
using (user_id = auth.uid());

create policy enterprises_select_own_active
on public.enterprises for select to authenticated
using (owner_id = auth.uid() and deletion_state = 'active');

create or replace function private.require_authenticated_user()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'unauthorized';
  end if;
  return v_user_id;
end;
$$;

create or replace function public.create_enterprise(p_input jsonb, p_mutation_id uuid)
returns public.enterprises
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_authenticated_user();
  v_request_hash text;
  v_existing public.client_mutations%rowtype;
  v_enterprise public.enterprises%rowtype;
begin
  if p_mutation_id is null or p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception using errcode = '22023', message = 'validation_failed';
  end if;

  v_request_hash := encode(extensions.digest(convert_to(p_input::text, 'UTF8'), 'sha256'), 'hex');
  select * into v_existing
  from public.client_mutations
  where owner_id = v_user_id and mutation_id = p_mutation_id;

  if found then
    if v_existing.request_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'idempotency_mismatch';
    end if;
    select * into v_enterprise
    from public.enterprises
    where id = (v_existing.result->>'enterpriseId')::uuid and owner_id = v_user_id;
    return v_enterprise;
  end if;

  insert into public.enterprises (owner_id, name, region_province, region_city, industry)
  values (
    v_user_id,
    btrim(p_input->>'name'),
    btrim(p_input->>'regionProvince'),
    btrim(p_input->>'regionCity'),
    btrim(p_input->>'industry')
  )
  returning * into v_enterprise;

  update public.account_profiles
  set current_enterprise_id = v_enterprise.id
  where user_id = v_user_id;

  insert into public.client_mutations (owner_id, mutation_id, resource_type, resource_id, request_hash, result)
  values (v_user_id, p_mutation_id, 'enterprise.create', v_enterprise.id, v_request_hash,
    jsonb_build_object('enterpriseId', v_enterprise.id));

  perform private.append_audit_event(
    v_user_id, v_user_id, v_enterprise.id, 'enterprise.created', 'enterprise',
    v_enterprise.id, extensions.gen_random_uuid(), null, null,
    jsonb_build_object('revision', v_enterprise.revision)
  );

  return v_enterprise;
end;
$$;

create or replace function public.update_enterprise(
  p_enterprise_id uuid,
  p_expected_revision integer,
  p_input jsonb,
  p_mutation_id uuid
)
returns public.enterprises
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_authenticated_user();
  v_request_hash text;
  v_existing public.client_mutations%rowtype;
  v_enterprise public.enterprises%rowtype;
begin
  if p_mutation_id is null or p_expected_revision < 1 or p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception using errcode = '22023', message = 'validation_failed';
  end if;

  v_request_hash := encode(extensions.digest(
    convert_to(jsonb_build_object('id', p_enterprise_id, 'revision', p_expected_revision, 'input', p_input)::text, 'UTF8'),
    'sha256'
  ), 'hex');

  select * into v_existing
  from public.client_mutations
  where owner_id = v_user_id and mutation_id = p_mutation_id;

  if found then
    if v_existing.request_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'idempotency_mismatch';
    end if;
    select * into v_enterprise from public.enterprises
    where id = p_enterprise_id and owner_id = v_user_id;
    return v_enterprise;
  end if;

  update public.enterprises
  set name = btrim(p_input->>'name'),
      region_province = btrim(p_input->>'regionProvince'),
      region_city = btrim(p_input->>'regionCity'),
      industry = btrim(p_input->>'industry'),
      revision = revision + 1
  where id = p_enterprise_id
    and owner_id = v_user_id
    and deletion_state = 'active'
    and revision = p_expected_revision
  returning * into v_enterprise;

  if not found then
    if exists (select 1 from public.enterprises where id = p_enterprise_id and owner_id = v_user_id and deletion_state = 'active') then
      raise exception using errcode = '40001', message = 'conflict';
    end if;
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;

  insert into public.client_mutations (owner_id, mutation_id, resource_type, resource_id, request_hash, result)
  values (v_user_id, p_mutation_id, 'enterprise.update', v_enterprise.id, v_request_hash,
    jsonb_build_object('enterpriseId', v_enterprise.id, 'revision', v_enterprise.revision));

  perform private.append_audit_event(
    v_user_id, v_user_id, v_enterprise.id, 'enterprise.updated', 'enterprise',
    v_enterprise.id, extensions.gen_random_uuid(), null, null,
    jsonb_build_object('revision', v_enterprise.revision)
  );

  return v_enterprise;
end;
$$;

create or replace function public.switch_current_enterprise(p_enterprise_id uuid)
returns public.enterprises
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_authenticated_user();
  v_enterprise public.enterprises%rowtype;
begin
  select * into v_enterprise
  from public.enterprises
  where id = p_enterprise_id and owner_id = v_user_id and deletion_state = 'active';
  if not found then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;

  update public.account_profiles set current_enterprise_id = p_enterprise_id where user_id = v_user_id;
  return v_enterprise;
end;
$$;

create or replace function public.revoke_enterprise_for_deletion(p_enterprise_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_authenticated_user();
  v_job_id uuid;
begin
  update public.enterprises
  set deletion_state = 'revoked', revision = revision + 1
  where id = p_enterprise_id and owner_id = v_user_id and deletion_state = 'active';
  if not found then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;

  insert into public.deletion_jobs (owner_id, resource_type, resource_id)
  values (v_user_id, 'enterprise', p_enterprise_id)
  on conflict (resource_type, resource_id) do update set updated_at = timezone('utc', now())
  returning id into v_job_id;

  update public.account_profiles
  set current_enterprise_id = (
    select id from public.enterprises
    where owner_id = v_user_id and deletion_state = 'active' and id <> p_enterprise_id
    order by created_at asc limit 1
  )
  where user_id = v_user_id and current_enterprise_id = p_enterprise_id;

  perform private.append_audit_event(
    v_user_id, v_user_id, p_enterprise_id, 'enterprise.deletion_revoked', 'enterprise',
    p_enterprise_id, extensions.gen_random_uuid(), null, null,
    jsonb_build_object('jobId', v_job_id)
  );
  return v_job_id;
end;
$$;

revoke all on function private.require_authenticated_user() from public, anon, authenticated;
grant execute on function private.require_authenticated_user() to authenticated, service_role;

revoke all on function public.create_enterprise(jsonb, uuid) from public, anon;
revoke all on function public.update_enterprise(uuid, integer, jsonb, uuid) from public, anon;
revoke all on function public.switch_current_enterprise(uuid) from public, anon;
revoke all on function public.revoke_enterprise_for_deletion(uuid) from public, anon;
grant execute on function public.create_enterprise(jsonb, uuid) to authenticated;
grant execute on function public.update_enterprise(uuid, integer, jsonb, uuid) to authenticated;
grant execute on function public.switch_current_enterprise(uuid) to authenticated;
grant execute on function public.revoke_enterprise_for_deletion(uuid) to authenticated;

commit;
