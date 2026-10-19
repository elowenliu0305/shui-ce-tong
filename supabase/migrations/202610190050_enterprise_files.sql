begin;

create table public.enterprise_files (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  enterprise_id uuid not null,
  original_name text not null check (length(btrim(original_name)) between 1 and 255),
  detected_mime text not null check (length(btrim(detected_mime)) between 1 and 150),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 20971520),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  storage_key text not null unique,
  processing_status text not null default 'upload_pending'
    check (processing_status in ('upload_pending', 'uploaded', 'processing', 'ready', 'failed')),
  reading_status text not null default 'not_read'
    check (reading_status in ('not_read', 'partial', 'complete', 'failed')),
  deletion_state text not null default 'active'
    check (deletion_state in ('active', 'revoked', 'purging', 'failed')),
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, owner_id, enterprise_id),
  foreign key (enterprise_id, owner_id) references public.enterprises(id, owner_id) on delete cascade
);

create table public.enterprise_file_artifacts (
  id uuid primary key default extensions.gen_random_uuid(),
  file_id uuid not null references public.enterprise_files(id) on delete cascade,
  artifact_type text not null check (artifact_type in ('extracted_text', 'chunk', 'embedding', 'preview')),
  storage_key text,
  content_hash text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.file_analysis_records (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  enterprise_id uuid not null,
  file_id uuid not null,
  task_type text not null check (task_type in ('tax-health', 'rd-check', 'invoice-check', 'cashflow-summary')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  reading_status text not null default 'not_read' check (reading_status in ('not_read', 'partial', 'complete', 'failed')),
  input_manifest jsonb not null default '{}'::jsonb,
  result jsonb,
  citations jsonb not null default '[]'::jsonb,
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  foreign key (file_id, owner_id, enterprise_id)
    references public.enterprise_files(id, owner_id, enterprise_id) on delete cascade,
  foreign key (enterprise_id, owner_id) references public.enterprises(id, owner_id) on delete cascade,
  constraint file_analysis_input_is_object check (jsonb_typeof(input_manifest) = 'object'),
  constraint file_analysis_result_is_object check (result is null or jsonb_typeof(result) = 'object'),
  constraint file_analysis_citations_is_array check (jsonb_typeof(citations) = 'array'),
  constraint file_analysis_terminal_shape check (
    (status = 'completed' and completed_at is not null and result is not null and error_code is null)
    or (status = 'failed' and completed_at is not null and result is null and error_code is not null)
    or (status in ('queued', 'processing') and completed_at is null and result is null and error_code is null)
  )
);

create index enterprise_files_owner_enterprise_created_idx
on public.enterprise_files (owner_id, enterprise_id, created_at desc);
create index enterprise_files_deletion_status_idx
on public.enterprise_files (deletion_state, processing_status, created_at);
create index enterprise_file_artifacts_file_idx
on public.enterprise_file_artifacts (file_id, artifact_type, created_at);
create index file_analysis_owner_enterprise_created_idx
on public.file_analysis_records (owner_id, enterprise_id, created_at desc);
create index file_analysis_file_created_idx
on public.file_analysis_records (file_id, created_at desc);

create trigger enterprise_files_set_updated_at before update on public.enterprise_files
for each row execute function private.set_updated_at();
create trigger file_analysis_records_set_updated_at before update on public.file_analysis_records
for each row execute function private.set_updated_at();

create or replace function private.reject_terminal_file_analysis_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('completed', 'failed') then
    raise exception using errcode = '55000', message = 'immutable_file_analysis';
  end if;
  return new;
end;
$$;

create trigger file_analysis_terminal_immutable before update on public.file_analysis_records
for each row execute function private.reject_terminal_file_analysis_update();

revoke all on function private.reject_terminal_file_analysis_update() from public, anon, authenticated;

commit;
