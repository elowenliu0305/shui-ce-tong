begin;
select plan(9);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'a@example.com', 'test', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'b@example.com', 'test', now(), '{}', '{}', now(), now());

insert into public.enterprises (id, owner_id, name, region_province, region_city, industry)
values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A 企业一', '浙江省', '杭州市', '软件业'),
  ('12000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'A 企业二', '上海市', '上海市', '制造业'),
  ('22000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'B 企业', '北京市', '北京市', '零售业');

select tests.authenticate_as('10000000-0000-0000-0000-000000000001');
select is((select count(*) from public.account_profiles), 1::bigint, 'account A sees only own profile');
select is((select count(*) from public.enterprises), 2::bigint, 'account A sees only own active enterprises');
select is_empty(
  $$ select id from public.enterprises where id = '22000000-0000-0000-0000-000000000002' $$,
  'account A cannot see account B enterprise'
);
select throws_ok(
  $$ update public.enterprises set name = 'forged' where id = '11000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'direct enterprise updates are denied'
);

reset role;
select tests.authenticate_as('20000000-0000-0000-0000-000000000002');
select is((select count(*) from public.enterprises), 1::bigint, 'account B sees only its enterprise');
select is_empty(
  $$ select id from public.enterprises where id = '11000000-0000-0000-0000-000000000001' $$,
  'account B cannot see account A enterprise'
);

reset role;
update public.enterprises set deletion_state = 'revoked' where id = '11000000-0000-0000-0000-000000000001';
select tests.authenticate_as('10000000-0000-0000-0000-000000000001');
select is((select count(*) from public.enterprises), 1::bigint, 'revoked enterprise becomes immediately invisible');
select is_empty(
  $$ select id from public.enterprises where id = '11000000-0000-0000-0000-000000000001' $$,
  'owner cannot read revoked enterprise'
);
select throws_ok(
  $$ insert into public.enterprises (owner_id, name, region_province, region_city, industry)
     values ('20000000-0000-0000-0000-000000000002', 'forged', 'x', 'y', 'z') $$,
  '42501', null, 'authenticated user cannot forge an enterprise insert'
);

reset role;
select * from finish();
rollback;
