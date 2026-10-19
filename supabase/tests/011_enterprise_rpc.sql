begin;
select plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'owner@example.com', 'test', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '40000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'other@example.com', 'test', now(), '{}', '{}', now(), now());

select tests.authenticate_as('30000000-0000-0000-0000-000000000003');
select lives_ok(
  $$ select public.create_enterprise(
    '{"name":"第一企业","regionProvince":"浙江省","regionCity":"杭州市","industry":"软件业"}'::jsonb,
    '31000000-0000-0000-0000-000000000001'
  ) $$,
  'owner creates enterprise through RPC'
);
select is((select count(*) from public.enterprises), 1::bigint, 'created enterprise is visible');
select is((select revision from public.enterprises limit 1), 1, 'new enterprise starts at revision 1');
select is(
  (select current_enterprise_id is not null from public.account_profiles where user_id = auth.uid()),
  true,
  'create selects current enterprise atomically'
);
select lives_ok(
  $$ select public.create_enterprise(
    '{"name":"第一企业","regionProvince":"浙江省","regionCity":"杭州市","industry":"软件业"}'::jsonb,
    '31000000-0000-0000-0000-000000000001'
  ) $$,
  'same create mutation is replayable'
);
select is((select count(*) from public.enterprises), 1::bigint, 'idempotent replay does not duplicate enterprise');

select lives_ok(
  format(
    $$ select public.update_enterprise(%L::uuid, 1,
      '{"name":"第一企业更新","regionProvince":"浙江省","regionCity":"杭州市","industry":"软件业"}'::jsonb,
      '32000000-0000-0000-0000-000000000002') $$,
    (select id from public.enterprises limit 1)
  ),
  'matching revision updates enterprise'
);
select throws_ok(
  format(
    $$ select public.update_enterprise(%L::uuid, 1,
      '{"name":"过期更新","regionProvince":"浙江省","regionCity":"杭州市","industry":"软件业"}'::jsonb,
      '33000000-0000-0000-0000-000000000003') $$,
    (select id from public.enterprises limit 1)
  ),
  '40001', 'conflict', 'stale revision is rejected'
);

reset role;
select * from finish();
rollback;
