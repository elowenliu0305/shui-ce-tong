begin;
select plan(23);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'files-a@example.com', 'test', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'files-b@example.com', 'test', now(), '{}', '{}', now(), now());

insert into public.enterprises (id, owner_id, name, region_province, region_city, industry) values
  ('91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '文件 A1', '浙江省', '杭州市', '软件业'),
  ('91000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', '文件 A2', '上海市', '上海市', '制造业'),
  ('92000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', '文件 B1', '北京市', '北京市', '零售业');

update public.account_profiles set current_enterprise_id = case user_id
  when '90000000-0000-0000-0000-000000000001' then '91000000-0000-0000-0000-000000000001'::uuid
  else '92000000-0000-0000-0000-000000000001'::uuid end
where user_id in ('90000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002');

select lives_ok(
  $$ select public.prepare_enterprise_file_upload(
    '90000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001',
    'A1.pdf', 'application/pdf', 128, 'tax-health', '.pdf',
    '93000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001'
  ) $$,
  'service prepares a current-enterprise upload'
);
select lives_ok(
  $$ select public.prepare_enterprise_file_upload(
    '90000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001',
    'A1.pdf', 'application/pdf', 128, 'tax-health', '.pdf',
    '93000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000002'
  ) $$,
  'same upload mutation is replayable'
);
select is((select count(*) from public.enterprise_files where owner_id = '90000000-0000-0000-0000-000000000001'), 1::bigint, 'replay creates one file');
select is((select count(*) from public.file_analysis_records where owner_id = '90000000-0000-0000-0000-000000000001'), 1::bigint, 'replay creates one analysis');

insert into public.enterprise_file_artifacts (file_id, artifact_type, storage_key, status)
select id, 'preview', storage_key || '.preview', 'ready' from public.enterprise_files where original_name = 'A1.pdf';
select lives_ok(
  $$ select public.finalize_enterprise_file_upload(
    '90000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001',
    (select id from public.enterprise_files where original_name = 'A1.pdf'),
    (select id from public.file_analysis_records where enterprise_id = '91000000-0000-0000-0000-000000000001'),
    repeat('a', 64), '94000000-0000-0000-0000-000000000003'
  ) $$,
  'service finalizes upload and analysis atomically'
);
select is((select status from public.file_analysis_records where enterprise_id = '91000000-0000-0000-0000-000000000001'), 'completed', 'analysis becomes completed');

update public.account_profiles set current_enterprise_id = '91000000-0000-0000-0000-000000000002'
where user_id = '90000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.prepare_enterprise_file_upload(
    '90000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002',
    'A2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 256, 'rd-check', '.docx',
    '93000000-0000-0000-0000-000000000002', '94000000-0000-0000-0000-000000000004'
  ) $$,
  'service prepares a second-enterprise upload'
);
select lives_ok(
  $$ select public.prepare_enterprise_file_upload(
    '90000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000001',
    'B1.csv', 'text/csv', 64, 'cashflow-summary', '.csv',
    '93000000-0000-0000-0000-000000000003', '94000000-0000-0000-0000-000000000005'
  ) $$,
  'service prepares another account upload'
);

update public.account_profiles set current_enterprise_id = '91000000-0000-0000-0000-000000000001'
where user_id = '90000000-0000-0000-0000-000000000001';
select tests.authenticate_as('90000000-0000-0000-0000-000000000001');
select is((select count(*) from public.enterprise_files), 1::bigint, 'account A sees only current-enterprise files');
select is((select count(*) from public.file_analysis_records), 1::bigint, 'account A sees only current-enterprise analyses');
select is_empty($$ select id from public.enterprise_files where enterprise_id = '91000000-0000-0000-0000-000000000002' $$, 'same-account other-enterprise file is hidden');
select is_empty($$ select id from public.enterprise_files where owner_id = '90000000-0000-0000-0000-000000000002' $$, 'other-account file is hidden');
select throws_ok(
  $$ insert into public.enterprise_files (owner_id, enterprise_id, original_name, detected_mime, byte_size, storage_key)
     values ('90000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'forged.pdf', 'application/pdf', 1, 'forged') $$,
  '42501', null, 'browser cannot insert file metadata directly'
);
select throws_ok($$ update public.file_analysis_records set result = '{}'::jsonb $$, '42501', null, 'browser cannot overwrite analyses');
select throws_ok($$ select * from public.enterprise_file_artifacts $$, '42501', null, 'browser cannot read derived artifacts');
select lives_ok(
  $$ select public.revoke_enterprise_file_for_deletion(
    (select id from public.file_analysis_records where enterprise_id = '91000000-0000-0000-0000-000000000001')
  ) $$,
  'owner can revoke current-enterprise file for deletion'
);
select is((select count(*) from public.enterprise_files), 0::bigint, 'revoked file becomes invisible immediately');

reset role;
update public.account_profiles set current_enterprise_id = '91000000-0000-0000-0000-000000000002'
where user_id = '90000000-0000-0000-0000-000000000001';
select tests.authenticate_as('90000000-0000-0000-0000-000000000001');
select is((select count(*) from public.enterprise_files), 1::bigint, 'switching enterprise reveals only its file');

reset role;
select tests.authenticate_as('90000000-0000-0000-0000-000000000002');
select is((select count(*) from public.enterprise_files), 1::bigint, 'account B sees its current-enterprise file');
select is_empty($$ select id from public.enterprise_files where owner_id = '90000000-0000-0000-0000-000000000001' $$, 'account B cannot see account A files');

reset role;
select lives_ok(
  $$ delete from public.enterprise_files where original_name = 'A1.pdf' $$,
  'service cleanup can physically delete a revoked file'
);
select is((select count(*) from public.file_analysis_records where enterprise_id = '91000000-0000-0000-0000-000000000001'), 0::bigint, 'file deletion cascades analyses');
select is((select count(*) from public.enterprise_file_artifacts), 0::bigint, 'file deletion cascades artifacts');

select * from finish();
rollback;
