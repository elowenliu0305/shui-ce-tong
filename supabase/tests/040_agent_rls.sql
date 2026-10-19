begin;
select plan(18);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '80000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'agent-a@example.com', 'test', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '80000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'agent-b@example.com', 'test', now(), '{}', '{}', now(), now());

insert into public.enterprises (id, owner_id, name, region_province, region_city, industry) values
  ('81000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'A 当前企业', '浙江省', '杭州市', '软件业'),
  ('81000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', 'A 其他企业', '上海市', '上海市', '制造业'),
  ('82000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 'B 企业', '北京市', '北京市', '零售业');

update public.account_profiles set current_enterprise_id = case user_id
  when '80000000-0000-0000-0000-000000000001' then '81000000-0000-0000-0000-000000000001'::uuid
  else '82000000-0000-0000-0000-000000000001'::uuid end
where user_id in ('80000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002');

select lives_ok(
  $$ select public.persist_agent_exchange(
    '80000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    null, null, null, '现金流问题', 'agent-idempotency-0001', repeat('a', 64), '怎么改善现金流？',
    '{"intent":"sme_finance_operations","status":"completed","content":"先做 13 周现金流表。","errorStage":null,"toolsUsed":["model"],"suggestedQuestions":[],"toolCalls":[]}'::jsonb,
    '[]'::jsonb, '{"contextFields":[]}'::jsonb, '83000000-0000-0000-0000-000000000001'
  ) $$,
  'service transaction persists one complete exchange'
);
select lives_ok(
  $$ select public.persist_agent_exchange(
    '80000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    null, null, null, '现金流问题', 'agent-idempotency-0001', repeat('a', 64), '怎么改善现金流？',
    '{"intent":"sme_finance_operations","status":"completed","content":"先做 13 周现金流表。","errorStage":null,"toolsUsed":["model"],"suggestedQuestions":[],"toolCalls":[]}'::jsonb,
    '[]'::jsonb, '{"contextFields":[]}'::jsonb, '83000000-0000-0000-0000-000000000002'
  ) $$,
  'same agent idempotency key is replayable'
);
select is(
  (select count(*) from public.agent_messages where owner_id = '80000000-0000-0000-0000-000000000001' and role = 'user'),
  1::bigint,
  'agent replay creates one user message'
);
select is(
  (select count(*) from public.agent_messages where owner_id = '80000000-0000-0000-0000-000000000001' and role = 'assistant'),
  1::bigint,
  'agent replay creates one assistant message'
);

insert into public.agent_conversations (id, owner_id, enterprise_id, title) values
  ('84000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000002', 'A2 会话'),
  ('84000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000001', 'B 会话');

select tests.authenticate_as('80000000-0000-0000-0000-000000000001');
select is((select count(*) from public.agent_conversations), 1::bigint, 'account A sees only its current-enterprise conversation');
select is((select count(*) from public.agent_messages), 2::bigint, 'account A sees only current-enterprise messages');
select is_empty(
  $$ select id from public.agent_conversations where enterprise_id = '81000000-0000-0000-0000-000000000002' $$,
  'same-account other-enterprise conversation is hidden'
);
select is_empty(
  $$ select id from public.agent_conversations where owner_id = '80000000-0000-0000-0000-000000000002' $$,
  'other-account conversation is hidden'
);
select is(
  jsonb_array_length(public.list_agent_conversations('81000000-0000-0000-0000-000000000001')),
  1,
  'history RPC lists the current enterprise only'
);
select throws_ok(
  $$ select public.get_agent_conversation(
    '84000000-0000-0000-0000-000000000002',
    '81000000-0000-0000-0000-000000000002'
  ) $$,
  'P0002', 'not_found', 'history RPC rejects same-account other-enterprise reads'
);
select throws_ok(
  $$ insert into public.agent_conversations (owner_id, enterprise_id, title)
     values ('80000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'forged') $$,
  '42501', null, 'browser cannot insert conversations directly'
);
select throws_ok(
  $$ update public.agent_messages set content = 'forged' $$,
  '42501', null, 'browser cannot update immutable messages'
);
select throws_ok(
  $$ delete from public.agent_messages $$,
  '42501', null, 'browser cannot delete messages directly'
);

reset role;
update public.account_profiles set current_enterprise_id = '81000000-0000-0000-0000-000000000002'
where user_id = '80000000-0000-0000-0000-000000000001';
select tests.authenticate_as('80000000-0000-0000-0000-000000000001');
select is((select count(*) from public.agent_conversations), 1::bigint, 'switching enterprise reveals only the newly current conversation');
select is_empty(
  $$ select id from public.agent_conversations where enterprise_id = '81000000-0000-0000-0000-000000000001' $$,
  'switching enterprise immediately hides the previous conversation'
);

reset role;
select tests.authenticate_as('80000000-0000-0000-0000-000000000002');
select is((select count(*) from public.agent_conversations), 1::bigint, 'account B sees only its own current-enterprise conversation');
select is_empty(
  $$ select id from public.agent_conversations where owner_id = '80000000-0000-0000-0000-000000000001' $$,
  'account B cannot see account A conversations'
);
select lives_ok(
  $$ delete from public.agent_conversations where id = '84000000-0000-0000-0000-000000000003' $$,
  'account can delete a conversation in its current enterprise'
);

reset role;
select * from finish();
rollback;
