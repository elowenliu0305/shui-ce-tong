begin;

create unique index report_snapshots_identity_owner_enterprise_idx
on public.report_snapshots (id, owner_id, enterprise_id);

create table public.agent_conversations (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  enterprise_id uuid not null,
  report_snapshot_id uuid references public.report_snapshots(id) on delete set null,
  knowledge_document_id uuid references public.knowledge_documents(id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 100),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, owner_id, enterprise_id),
  foreign key (enterprise_id, owner_id) references public.enterprises(id, owner_id) on delete cascade
);

create table public.agent_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  enterprise_id uuid not null,
  reply_to_message_id uuid references public.agent_messages(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  intent text check (intent is null or intent in ('general', 'tax_policy_case', 'enterprise_report', 'sme_finance_operations')),
  status text not null check (status in ('pending', 'completed', 'insufficient_evidence', 'failed')),
  content text not null check (length(content) between 1 and 20000),
  error_stage text check (error_stage is null or error_stage in ('retrieval', 'context', 'model', 'persistence')),
  idempotency_key text,
  request_hash text,
  tool_summary jsonb not null default '{}'::jsonb,
  context_manifest jsonb not null default '{}'::jsonb,
  suggested_questions text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (conversation_id, owner_id, enterprise_id)
    references public.agent_conversations(id, owner_id, enterprise_id) on delete cascade,
  foreign key (enterprise_id, owner_id) references public.enterprises(id, owner_id) on delete cascade,
  constraint agent_tool_summary_is_object check (jsonb_typeof(tool_summary) = 'object'),
  constraint agent_context_manifest_is_object check (jsonb_typeof(context_manifest) = 'object'),
  constraint agent_idempotency_pair check (
    (role = 'user' and idempotency_key is not null and request_hash is not null)
    or (role = 'assistant' and idempotency_key is null and request_hash is null)
  )
);

create unique index agent_user_message_idempotency_idx
on public.agent_messages (owner_id, enterprise_id, idempotency_key)
where role = 'user';

create table public.agent_message_citations (
  message_id uuid not null references public.agent_messages(id) on delete cascade,
  citation_id uuid not null,
  document_id uuid not null references public.knowledge_documents(id),
  document_version_id uuid not null references public.knowledge_document_versions(id),
  chunk_id uuid not null references public.knowledge_chunks(id),
  rank integer not null check (rank > 0),
  title text not null,
  document_number text,
  issuer text[] not null default '{}',
  validity_status text not null,
  locator jsonb not null,
  quote_excerpt text,
  score double precision,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, citation_id),
  unique (message_id, rank),
  constraint agent_citation_locator_is_object check (jsonb_typeof(locator) = 'object')
);

create table public.agent_tool_calls (
  id uuid primary key default extensions.gen_random_uuid(),
  message_id uuid not null references public.agent_messages(id) on delete cascade,
  tool_name text not null check (length(tool_name) between 1 and 100),
  input_hash text,
  result_status text not null check (result_status in ('completed', 'empty', 'failed')),
  result_summary jsonb not null default '{}'::jsonb,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint agent_tool_result_summary_is_object check (jsonb_typeof(result_summary) = 'object')
);

create index agent_conversations_owner_enterprise_updated_idx
on public.agent_conversations (owner_id, enterprise_id, updated_at desc);
create index agent_messages_conversation_created_idx
on public.agent_messages (conversation_id, created_at, id);
create index agent_messages_owner_enterprise_created_idx
on public.agent_messages (owner_id, enterprise_id, created_at desc);
create index agent_citations_version_idx
on public.agent_message_citations (document_version_id, chunk_id);
create index agent_tool_calls_message_idx
on public.agent_tool_calls (message_id, created_at);

create trigger agent_conversations_set_updated_at before update on public.agent_conversations
for each row execute function private.set_updated_at();

create or replace function private.reject_final_agent_message_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('completed', 'insufficient_evidence', 'failed') then
    raise exception using errcode = '55000', message = 'immutable_agent_message';
  end if;
  return new;
end;
$$;

create trigger agent_final_messages_immutable before update on public.agent_messages
for each row execute function private.reject_final_agent_message_update();

revoke all on function private.reject_final_agent_message_update() from public, anon, authenticated;

commit;
