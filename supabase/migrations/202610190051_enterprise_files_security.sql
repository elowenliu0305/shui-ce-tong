begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'enterprise-files',
  'enterprise-files',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'application/json',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.enterprise_files enable row level security;
alter table public.enterprise_file_artifacts enable row level security;
alter table public.file_analysis_records enable row level security;
alter table public.enterprise_files force row level security;
alter table public.enterprise_file_artifacts force row level security;
alter table public.file_analysis_records force row level security;

revoke all on public.enterprise_files, public.enterprise_file_artifacts, public.file_analysis_records from anon, authenticated;
grant select on public.enterprise_files, public.file_analysis_records to authenticated;

create policy enterprise_files_select_current_enterprise
on public.enterprise_files for select to authenticated
using (
  owner_id = auth.uid()
  and deletion_state = 'active'
  and exists (
    select 1 from public.enterprises e
    where e.id = enterprise_id and e.owner_id = auth.uid() and e.deletion_state = 'active'
  )
  and exists (
    select 1 from public.account_profiles p
    where p.user_id = auth.uid() and p.current_enterprise_id = enterprise_id
  )
);

create policy file_analysis_select_current_enterprise
on public.file_analysis_records for select to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.enterprise_files f
    join public.enterprises e on e.id = f.enterprise_id and e.owner_id = f.owner_id
    join public.account_profiles p on p.user_id = f.owner_id and p.current_enterprise_id = f.enterprise_id
    where f.id = file_id and f.owner_id = auth.uid()
      and f.deletion_state = 'active' and e.deletion_state = 'active'
  )
);

create or replace function private.file_analysis_json(p_record_id uuid, p_owner_id uuid, p_enterprise_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'fileId', f.id,
    'enterpriseId', a.enterprise_id,
    'displayName', f.original_name,
    'mediaType', f.detected_mime,
    'byteSize', f.byte_size,
    'selectedTask', a.task_type,
    'status', case a.status when 'queued' then 'processing' else a.status end,
    'readingStatus', replace(a.reading_status, '_', '-'),
    'contentRead', a.reading_status in ('partial', 'complete'),
    'resultSummary', a.result->>'summary',
    'errorCode', a.error_code,
    'sourceAvailable', f.processing_status in ('uploaded', 'processing', 'ready') and f.deletion_state = 'active',
    'createdAt', a.created_at,
    'updatedAt', a.updated_at
  )
  from public.file_analysis_records a
  join public.enterprise_files f on f.id = a.file_id
  where a.id = p_record_id and a.owner_id = p_owner_id
    and a.enterprise_id = p_enterprise_id and f.deletion_state = 'active';
$$;

create or replace function public.prepare_enterprise_file_upload(
  p_owner_id uuid,
  p_enterprise_id uuid,
  p_original_name text,
  p_detected_mime text,
  p_byte_size bigint,
  p_task_type text,
  p_extension text,
  p_mutation_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_hash text;
  v_existing public.client_mutations%rowtype;
  v_file_id uuid;
  v_record_id uuid;
  v_storage_key text;
begin
  if p_owner_id is null or p_enterprise_id is null or p_mutation_id is null
    or length(btrim(coalesce(p_original_name, ''))) not between 1 and 255
    or length(btrim(coalesce(p_detected_mime, ''))) not between 1 and 150
    or p_byte_size is null or p_byte_size <= 0 or p_byte_size > 20971520
    or p_task_type is null or p_task_type not in ('tax-health', 'rd-check', 'invoice-check', 'cashflow-summary')
    or p_extension is null or p_extension !~ '^\.[a-z0-9]{1,8}$' then
    raise exception using errcode = '22023', message = 'validation_failed';
  end if;
  if not exists (
    select 1 from public.enterprises e
    join public.account_profiles p on p.user_id = e.owner_id and p.current_enterprise_id = e.id
    where e.id = p_enterprise_id and e.owner_id = p_owner_id and e.deletion_state = 'active'
  ) then raise exception using errcode = 'P0002', message = 'not_found'; end if;

  v_request_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'enterpriseId', p_enterprise_id, 'originalName', btrim(p_original_name),
    'mime', btrim(p_detected_mime), 'byteSize', p_byte_size,
    'taskType', p_task_type, 'extension', p_extension
  )::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing from public.client_mutations
  where owner_id = p_owner_id and mutation_id = p_mutation_id;
  if found then
    if v_existing.request_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'idempotency_mismatch';
    end if;
    v_file_id := v_existing.resource_id;
    v_record_id := (v_existing.result->>'recordId')::uuid;
    select storage_key into v_storage_key from public.enterprise_files
    where id = v_file_id and owner_id = p_owner_id and enterprise_id = p_enterprise_id
      and deletion_state = 'active';
    if v_storage_key is null then raise exception using errcode = 'P0002', message = 'not_found'; end if;
    return jsonb_build_object(
      'fileId', v_file_id, 'recordId', v_record_id, 'storageKey', v_storage_key,
      'record', private.file_analysis_json(v_record_id, p_owner_id, p_enterprise_id), 'replayed', true
    );
  end if;

  v_file_id := extensions.gen_random_uuid();
  v_record_id := extensions.gen_random_uuid();
  v_storage_key := p_owner_id::text || '/' || p_enterprise_id::text || '/' || v_file_id::text || '/source' || p_extension;
  insert into public.enterprise_files (
    id, owner_id, enterprise_id, original_name, detected_mime, byte_size, storage_key
  ) values (
    v_file_id, p_owner_id, p_enterprise_id, btrim(p_original_name), btrim(p_detected_mime), p_byte_size, v_storage_key
  );
  insert into public.file_analysis_records (
    id, owner_id, enterprise_id, file_id, task_type, input_manifest
  ) values (
    v_record_id, p_owner_id, p_enterprise_id, v_file_id, p_task_type,
    jsonb_build_object('mime', btrim(p_detected_mime), 'byteSize', p_byte_size, 'contentProvidedToModel', false)
  );
  insert into public.client_mutations (owner_id, mutation_id, resource_type, resource_id, request_hash, result)
  values (
    p_owner_id, p_mutation_id, 'enterprise_file.prepare', v_file_id, v_request_hash,
    jsonb_build_object('fileId', v_file_id, 'recordId', v_record_id)
  );
  perform private.append_audit_event(
    p_owner_id, p_owner_id, p_enterprise_id, 'enterprise_file.upload_prepared', 'enterprise_file',
    v_file_id, p_request_id, null, null,
    jsonb_build_object('recordId', v_record_id, 'taskType', p_task_type, 'byteSize', p_byte_size)
  );
  return jsonb_build_object(
    'fileId', v_file_id, 'recordId', v_record_id, 'storageKey', v_storage_key,
    'record', private.file_analysis_json(v_record_id, p_owner_id, p_enterprise_id), 'replayed', false
  );
end;
$$;

create or replace function public.finalize_enterprise_file_upload(
  p_owner_id uuid,
  p_enterprise_id uuid,
  p_file_id uuid,
  p_record_id uuid,
  p_sha256 text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'validation_failed';
  end if;
  update public.enterprise_files
  set sha256 = p_sha256, processing_status = 'ready', reading_status = 'not_read', error_code = null
  where id = p_file_id and owner_id = p_owner_id and enterprise_id = p_enterprise_id
    and deletion_state = 'active' and processing_status in ('upload_pending', 'uploaded');
  if not found and not exists (
    select 1 from public.enterprise_files where id = p_file_id and owner_id = p_owner_id
      and enterprise_id = p_enterprise_id and deletion_state = 'active'
      and processing_status = 'ready' and sha256 = p_sha256
  ) then raise exception using errcode = 'P0002', message = 'not_found'; end if;

  update public.file_analysis_records
  set status = 'completed', reading_status = 'not_read', completed_at = timezone('utc', now()),
      result = jsonb_build_object(
        'summary', '文件已安全上传。当前版本尚未读取正文，因此不生成文件内容结论。',
        'facts', '[]'::jsonb,
        'limitations', jsonb_build_array('content_not_read')
      )
  where id = p_record_id and file_id = p_file_id and owner_id = p_owner_id
    and enterprise_id = p_enterprise_id and status in ('queued', 'processing');
  perform private.append_audit_event(
    p_owner_id, p_owner_id, p_enterprise_id, 'enterprise_file.upload_completed', 'enterprise_file',
    p_file_id, p_request_id, null, p_sha256,
    jsonb_build_object('recordId', p_record_id, 'readingStatus', 'not_read')
  );
  return private.file_analysis_json(p_record_id, p_owner_id, p_enterprise_id);
end;
$$;

create or replace function public.fail_enterprise_file_upload(
  p_owner_id uuid,
  p_enterprise_id uuid,
  p_file_id uuid,
  p_record_id uuid,
  p_error_code text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_error_code is null or p_error_code not in ('upload_failed', 'object_missing', 'hash_failed', 'storage_unavailable') then
    raise exception using errcode = '22023', message = 'validation_failed';
  end if;
  update public.enterprise_files set processing_status = 'failed', reading_status = 'failed', error_code = p_error_code
  where id = p_file_id and owner_id = p_owner_id and enterprise_id = p_enterprise_id
    and deletion_state = 'active' and processing_status in ('upload_pending', 'uploaded', 'failed');
  if not found then raise exception using errcode = 'P0002', message = 'not_found'; end if;
  update public.file_analysis_records
  set status = 'failed', reading_status = 'failed', error_code = p_error_code, completed_at = timezone('utc', now())
  where id = p_record_id and file_id = p_file_id and owner_id = p_owner_id
    and enterprise_id = p_enterprise_id and status in ('queued', 'processing');
  perform private.append_audit_event(
    p_owner_id, p_owner_id, p_enterprise_id, 'enterprise_file.upload_failed', 'enterprise_file',
    p_file_id, p_request_id, null, null,
    jsonb_build_object('recordId', p_record_id, 'errorCode', p_error_code)
  );
  return private.file_analysis_json(p_record_id, p_owner_id, p_enterprise_id);
end;
$$;

create or replace function public.revoke_enterprise_file_for_deletion(p_record_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_authenticated_user();
  v_file public.enterprise_files%rowtype;
  v_job_id uuid;
  v_storage_keys text[];
begin
  select f.* into v_file
  from public.enterprise_files f
  join public.file_analysis_records a on a.file_id = f.id
  join public.account_profiles p on p.user_id = f.owner_id and p.current_enterprise_id = f.enterprise_id
  join public.enterprises e on e.id = f.enterprise_id and e.owner_id = f.owner_id and e.deletion_state = 'active'
  where a.id = p_record_id and f.owner_id = v_user_id
    and f.deletion_state in ('active', 'revoked', 'failed');
  if not found then raise exception using errcode = 'P0002', message = 'not_found'; end if;

  update public.enterprise_files set deletion_state = 'revoked' where id = v_file.id;
  select array_prepend(v_file.storage_key, coalesce(array_agg(storage_key) filter (where storage_key is not null), '{}'))
  into v_storage_keys from public.enterprise_file_artifacts where file_id = v_file.id;
  insert into public.deletion_jobs (owner_id, resource_type, resource_id, storage_keys)
  values (v_user_id, 'enterprise_file', v_file.id, v_storage_keys)
  on conflict (resource_type, resource_id) do update
    set status = 'queued', storage_keys = excluded.storage_keys, last_error_code = null, updated_at = timezone('utc', now())
  returning id into v_job_id;
  perform private.append_audit_event(
    v_user_id, v_user_id, v_file.enterprise_id, 'enterprise_file.deletion_revoked', 'enterprise_file',
    v_file.id, extensions.gen_random_uuid(), null, null,
    jsonb_build_object('jobId', v_job_id, 'storageObjectCount', cardinality(v_storage_keys))
  );
  return jsonb_build_object(
    'jobId', v_job_id, 'fileId', v_file.id, 'enterpriseId', v_file.enterprise_id,
    'storageKeys', to_jsonb(v_storage_keys)
  );
end;
$$;

revoke all on function private.file_analysis_json(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function private.file_analysis_json(uuid, uuid, uuid) to service_role;
revoke all on function public.prepare_enterprise_file_upload(uuid, uuid, text, text, bigint, text, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.finalize_enterprise_file_upload(uuid, uuid, uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.fail_enterprise_file_upload(uuid, uuid, uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.prepare_enterprise_file_upload(uuid, uuid, text, text, bigint, text, text, uuid, uuid) to service_role;
grant execute on function public.finalize_enterprise_file_upload(uuid, uuid, uuid, uuid, text, uuid) to service_role;
grant execute on function public.fail_enterprise_file_upload(uuid, uuid, uuid, uuid, text, uuid) to service_role;
revoke all on function public.revoke_enterprise_file_for_deletion(uuid) from public, anon;
grant execute on function public.revoke_enterprise_file_for_deletion(uuid) to authenticated;

create policy enterprise_files_storage_no_direct_select
on storage.objects for select to authenticated
using (bucket_id = 'enterprise-files' and false);
create policy enterprise_files_storage_no_direct_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'enterprise-files' and false);
create policy enterprise_files_storage_no_direct_update
on storage.objects for update to authenticated
using (bucket_id = 'enterprise-files' and false)
with check (bucket_id = 'enterprise-files' and false);
create policy enterprise_files_storage_no_direct_delete
on storage.objects for delete to authenticated
using (bucket_id = 'enterprise-files' and false);

commit;
