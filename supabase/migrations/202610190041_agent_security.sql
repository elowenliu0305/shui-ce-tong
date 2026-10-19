begin;

alter table public.agent_conversations enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_message_citations enable row level security;
alter table public.agent_tool_calls enable row level security;
alter table public.agent_conversations force row level security;
alter table public.agent_messages force row level security;
alter table public.agent_message_citations force row level security;
alter table public.agent_tool_calls force row level security;

revoke all on public.agent_conversations, public.agent_messages,
  public.agent_message_citations, public.agent_tool_calls from anon, authenticated;
grant select, delete on public.agent_conversations to authenticated;
grant select on public.agent_messages, public.agent_message_citations to authenticated;

create policy agent_conversations_select_own_active_enterprise
on public.agent_conversations for select to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.enterprises e
    where e.id = enterprise_id and e.owner_id = auth.uid() and e.deletion_state = 'active'
  )
  and exists (
    select 1 from public.account_profiles p
    where p.user_id = auth.uid() and p.current_enterprise_id = enterprise_id
  )
);

create policy agent_conversations_delete_own_active_enterprise
on public.agent_conversations for delete to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.enterprises e
    where e.id = enterprise_id and e.owner_id = auth.uid() and e.deletion_state = 'active'
  )
  and exists (
    select 1 from public.account_profiles p
    where p.user_id = auth.uid() and p.current_enterprise_id = enterprise_id
  )
);

create policy agent_messages_select_own_active_enterprise
on public.agent_messages for select to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.enterprises e
    where e.id = enterprise_id and e.owner_id = auth.uid() and e.deletion_state = 'active'
  )
  and exists (
    select 1 from public.account_profiles p
    where p.user_id = auth.uid() and p.current_enterprise_id = enterprise_id
  )
);

create policy agent_message_citations_select_own
on public.agent_message_citations for select to authenticated
using (
  exists (
    select 1 from public.agent_messages m
    join public.enterprises e on e.id = m.enterprise_id and e.owner_id = m.owner_id
    join public.account_profiles p on p.user_id = m.owner_id and p.current_enterprise_id = m.enterprise_id
    where m.id = message_id and m.owner_id = auth.uid() and e.deletion_state = 'active'
  )
);

create or replace function private.agent_conversation_json(p_conversation_id uuid, p_owner_id uuid, p_enterprise_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'enterpriseId', c.enterprise_id,
    'reportSnapshotId', c.report_snapshot_id,
    'knowledgeDocumentId', c.knowledge_document_id,
    'title', c.title,
    'createdAt', c.created_at,
    'updatedAt', c.updated_at,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'conversationId', m.conversation_id,
        'role', m.role,
        'content', m.content,
        'intent', m.intent,
        'status', m.status,
        'errorStage', m.error_stage,
        'toolsUsed', coalesce(m.tool_summary->'toolsUsed', '[]'::jsonb),
        'suggestedQuestions', to_jsonb(m.suggested_questions),
        'createdAt', m.created_at,
        'citations', coalesce((
          select jsonb_agg(jsonb_build_object(
            'citationId', mc.citation_id,
            'documentId', mc.document_id,
            'documentVersionId', mc.document_version_id,
            'chunkId', mc.chunk_id,
            'title', mc.title,
            'documentNumber', mc.document_number,
            'issuer', to_jsonb(mc.issuer),
            'validityStatus', mc.validity_status,
            'locator', mc.locator,
            'excerpt', mc.quote_excerpt,
            'score', mc.score
          ) order by mc.rank)
          from public.agent_message_citations mc where mc.message_id = m.id
        ), '[]'::jsonb)
      ) order by m.created_at, m.id)
      from public.agent_messages m where m.conversation_id = c.id
    ), '[]'::jsonb)
  )
  from public.agent_conversations c
  where c.id = p_conversation_id and c.owner_id = p_owner_id
    and c.enterprise_id = p_enterprise_id and c.status = 'active';
$$;

create or replace function public.get_agent_conversation(p_conversation_id uuid, p_enterprise_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_authenticated_user();
  v_result jsonb;
begin
  if not exists (
    select 1 from public.enterprises
    where id = p_enterprise_id and owner_id = v_user_id and deletion_state = 'active'
  ) then raise exception using errcode = 'P0002', message = 'not_found'; end if;
  if not exists (
    select 1 from public.account_profiles
    where user_id = v_user_id and current_enterprise_id = p_enterprise_id
  ) then raise exception using errcode = 'P0002', message = 'not_found'; end if;
  v_result := private.agent_conversation_json(p_conversation_id, v_user_id, p_enterprise_id);
  if v_result is null then raise exception using errcode = 'P0002', message = 'not_found'; end if;
  return v_result;
end;
$$;

create or replace function public.get_agent_conversation_for_service(
  p_conversation_id uuid,
  p_owner_id uuid,
  p_enterprise_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.agent_conversation_json(p_conversation_id, p_owner_id, p_enterprise_id);
$$;

create or replace function public.list_agent_conversations(p_enterprise_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_authenticated_user();
  v_result jsonb;
begin
  if not exists (
    select 1 from public.enterprises
    where id = p_enterprise_id and owner_id = v_user_id and deletion_state = 'active'
  ) then raise exception using errcode = 'P0002', message = 'not_found'; end if;
  if not exists (
    select 1 from public.account_profiles
    where user_id = v_user_id and current_enterprise_id = p_enterprise_id
  ) then raise exception using errcode = 'P0002', message = 'not_found'; end if;
  select coalesce(jsonb_agg(private.agent_conversation_json(c.id, v_user_id, p_enterprise_id)
    order by c.updated_at desc), '[]'::jsonb)
  into v_result
  from public.agent_conversations c
  where c.owner_id = v_user_id and c.enterprise_id = p_enterprise_id and c.status = 'active';
  return v_result;
end;
$$;

create or replace function public.persist_agent_exchange(
  p_owner_id uuid,
  p_enterprise_id uuid,
  p_conversation_id uuid,
  p_report_snapshot_id uuid,
  p_knowledge_document_id uuid,
  p_title text,
  p_idempotency_key text,
  p_request_hash text,
  p_user_content text,
  p_assistant jsonb,
  p_citations jsonb,
  p_context_manifest jsonb,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation_id uuid := p_conversation_id;
  v_user_message_id uuid;
  v_assistant_message_id uuid;
  v_existing_hash text;
  v_result jsonb;
  v_citation jsonb;
  v_tool jsonb;
begin
  if p_owner_id is null or p_enterprise_id is null
    or p_idempotency_key is null or length(p_idempotency_key) not between 16 and 128
    or p_request_hash is null or length(p_request_hash) <> 64
    or p_user_content is null or length(btrim(p_user_content)) not between 1 and 8000
    or p_assistant is null or jsonb_typeof(p_assistant) <> 'object'
    or coalesce(jsonb_typeof(p_citations), 'null') <> 'array'
    or coalesce(jsonb_typeof(p_context_manifest), 'null') <> 'object' then
    raise exception using errcode = '22023', message = 'validation_failed';
  end if;
  if not exists (
    select 1 from public.enterprises
    where id = p_enterprise_id and owner_id = p_owner_id and deletion_state = 'active'
  ) then raise exception using errcode = 'P0002', message = 'not_found'; end if;
  if not exists (
    select 1 from public.account_profiles
    where user_id = p_owner_id and current_enterprise_id = p_enterprise_id
  ) then raise exception using errcode = 'P0002', message = 'not_found'; end if;

  select id, request_hash, conversation_id
  into v_user_message_id, v_existing_hash, v_conversation_id
  from public.agent_messages
  where owner_id = p_owner_id and enterprise_id = p_enterprise_id
    and role = 'user' and idempotency_key = p_idempotency_key;
  if found then
    if v_existing_hash <> p_request_hash then
      raise exception using errcode = '23505', message = 'idempotency_mismatch';
    end if;
    select id into v_assistant_message_id from public.agent_messages
    where reply_to_message_id = v_user_message_id and role = 'assistant' limit 1;
    if v_assistant_message_id is null then
      raise exception using errcode = '55000', message = 'idempotency_incomplete';
    end if;
    v_result := private.agent_conversation_json(v_conversation_id, p_owner_id, p_enterprise_id);
    return jsonb_build_object(
      'conversation', v_result,
      'assistantMessageId', v_assistant_message_id,
      'replayed', true
    );
  end if;

  if p_report_snapshot_id is not null and not exists (
    select 1 from public.report_snapshots
    where id = p_report_snapshot_id and owner_id = p_owner_id and enterprise_id = p_enterprise_id
  ) then raise exception using errcode = 'P0002', message = 'not_found'; end if;
  if p_knowledge_document_id is not null and not exists (
    select 1 from public.knowledge_documents
    where id = p_knowledge_document_id and visibility = 'published'
  ) then raise exception using errcode = 'P0002', message = 'not_found'; end if;

  if v_conversation_id is null then
    insert into public.agent_conversations (
      owner_id, enterprise_id, report_snapshot_id, knowledge_document_id, title
    ) values (
      p_owner_id, p_enterprise_id, p_report_snapshot_id, p_knowledge_document_id,
      left(coalesce(nullif(btrim(p_title), ''), btrim(p_user_content)), 100)
    ) returning id into v_conversation_id;
  elsif not exists (
    select 1 from public.agent_conversations
    where id = v_conversation_id and owner_id = p_owner_id
      and enterprise_id = p_enterprise_id and status = 'active'
  ) then raise exception using errcode = 'P0002', message = 'not_found'; end if;

  insert into public.agent_messages (
    conversation_id, owner_id, enterprise_id, role, status, content,
    idempotency_key, request_hash
  ) values (
    v_conversation_id, p_owner_id, p_enterprise_id, 'user', 'completed', btrim(p_user_content),
    p_idempotency_key, p_request_hash
  ) returning id into v_user_message_id;

  insert into public.agent_messages (
    conversation_id, owner_id, enterprise_id, reply_to_message_id, role, intent,
    status, content, error_stage, tool_summary, context_manifest, suggested_questions
  ) values (
    v_conversation_id, p_owner_id, p_enterprise_id, v_user_message_id, 'assistant',
    p_assistant->>'intent', p_assistant->>'status', p_assistant->>'content',
    nullif(p_assistant->>'errorStage', ''),
    jsonb_build_object('toolsUsed', coalesce(p_assistant->'toolsUsed', '[]'::jsonb)),
    p_context_manifest,
    coalesce(array(select jsonb_array_elements_text(coalesce(p_assistant->'suggestedQuestions', '[]'::jsonb))), '{}')
  ) returning id into v_assistant_message_id;

  for v_citation in select value from jsonb_array_elements(p_citations)
  loop
    insert into public.agent_message_citations (
      message_id, citation_id, document_id, document_version_id, chunk_id, rank,
      title, document_number, issuer, validity_status, locator, quote_excerpt, score
    ) values (
      v_assistant_message_id,
      (v_citation->>'citationId')::uuid,
      (v_citation->>'documentId')::uuid,
      (v_citation->>'documentVersionId')::uuid,
      (v_citation->>'chunkId')::uuid,
      coalesce((v_citation->>'rank')::integer, 1),
      v_citation->>'title', v_citation->>'documentNumber',
      coalesce(array(select jsonb_array_elements_text(coalesce(v_citation->'issuer', '[]'::jsonb))), '{}'),
      v_citation->>'validityStatus', coalesce(v_citation->'locator', '{}'::jsonb),
      v_citation->>'excerpt', (v_citation->>'score')::double precision
    );
  end loop;

  for v_tool in select value from jsonb_array_elements(coalesce(p_assistant->'toolCalls', '[]'::jsonb))
  loop
    insert into public.agent_tool_calls (
      message_id, tool_name, input_hash, result_status, result_summary, duration_ms
    ) values (
      v_assistant_message_id, v_tool->>'name', v_tool->>'inputHash',
      coalesce(v_tool->>'status', 'completed'), coalesce(v_tool->'summary', '{}'::jsonb),
      (v_tool->>'durationMs')::integer
    );
  end loop;

  update public.agent_conversations set updated_at = timezone('utc', now()) where id = v_conversation_id;
  perform private.append_audit_event(
    p_owner_id, p_owner_id, p_enterprise_id, 'agent.exchange.completed', 'agent_message',
    v_assistant_message_id, p_request_id, null, null,
    jsonb_build_object(
      'intent', p_assistant->>'intent', 'status', p_assistant->>'status',
      'citationCount', jsonb_array_length(p_citations),
      'toolCount', jsonb_array_length(coalesce(p_assistant->'toolCalls', '[]'::jsonb))
    )
  );
  v_result := private.agent_conversation_json(v_conversation_id, p_owner_id, p_enterprise_id);
  return jsonb_build_object(
    'conversation', v_result,
    'assistantMessageId', v_assistant_message_id,
    'replayed', false
  );
exception
  when unique_violation then
    select id, request_hash, conversation_id
    into v_user_message_id, v_existing_hash, v_conversation_id
    from public.agent_messages
    where owner_id = p_owner_id and enterprise_id = p_enterprise_id
      and role = 'user' and idempotency_key = p_idempotency_key;
    if v_existing_hash is null or v_existing_hash <> p_request_hash then
      raise exception using errcode = '23505', message = 'idempotency_mismatch';
    end if;
    select id into v_assistant_message_id from public.agent_messages
    where reply_to_message_id = v_user_message_id and role = 'assistant' limit 1;
    return jsonb_build_object(
      'conversation', private.agent_conversation_json(v_conversation_id, p_owner_id, p_enterprise_id),
      'assistantMessageId', v_assistant_message_id,
      'replayed', true
    );
end;
$$;

revoke all on function private.agent_conversation_json(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function private.agent_conversation_json(uuid, uuid, uuid) to service_role;
revoke all on function public.get_agent_conversation_for_service(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_agent_conversation_for_service(uuid, uuid, uuid) to service_role;
revoke all on function public.get_agent_conversation(uuid, uuid) from public, anon;
revoke all on function public.list_agent_conversations(uuid) from public, anon;
grant execute on function public.get_agent_conversation(uuid, uuid) to authenticated;
grant execute on function public.list_agent_conversations(uuid) to authenticated;
revoke all on function public.persist_agent_exchange(uuid, uuid, uuid, uuid, uuid, text, text, text, text, jsonb, jsonb, jsonb, uuid)
from public, anon, authenticated;
grant execute on function public.persist_agent_exchange(uuid, uuid, uuid, uuid, uuid, text, text, text, text, jsonb, jsonb, jsonb, uuid)
to service_role;

commit;
