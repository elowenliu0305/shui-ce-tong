begin;
select plan(10);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'reader-a@example.com', 'test', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'reader-b@example.com', 'test', now(), '{}', '{}', now(), now());

insert into public.knowledge_import_batches (
  id, manifest_name, archive_sha256, expected_count, observed_count, status, completed_at
) values (
  '61000000-0000-0000-0000-000000000001', 'rls-test.zip', repeat('a', 64), 1, 1, 'completed', now()
);

insert into public.knowledge_source_objects (
  id, batch_id, relative_path, original_name, detected_mime, byte_size, sha256,
  storage_key, parse_status, duplicate_status, review_status
) values (
  '62000000-0000-0000-0000-000000000001',
  '61000000-0000-0000-0000-000000000001',
  '政策/公开政策.pdf', '公开政策.pdf', 'application/pdf', 4, repeat('b', 64),
  '61000000-0000-0000-0000-000000000001/62000000-0000-0000-0000-000000000001/source.pdf',
  'parsed', 'unique', 'verified'
);

insert into public.knowledge_documents (id, stable_slug, category, visibility)
values ('63000000-0000-0000-0000-000000000001', 'rls-public-policy', 'policy', 'published');

insert into public.knowledge_document_versions (
  id, document_id, version_no, title, document_number, issuer, published_on,
  validity_status, summary, body_text, body_hash, metadata_hash, review_status,
  parser_manifest
) values (
  '64000000-0000-0000-0000-000000000001',
  '63000000-0000-0000-0000-000000000001', 1, '公开政策', '测试〔2026〕1号',
  array['测试税务局'], '2026-01-01', 'current', '用于 RLS 验收。', '公开正文。',
  repeat('c', 64), repeat('d', 64), 'verified', '{"status":"parsed"}'::jsonb
);

update public.knowledge_documents
set current_version_id = '64000000-0000-0000-0000-000000000001'
where id = '63000000-0000-0000-0000-000000000001';

insert into public.knowledge_version_sources (document_version_id, source_object_id, relation)
values (
  '64000000-0000-0000-0000-000000000001',
  '62000000-0000-0000-0000-000000000001',
  'primary'
);

insert into storage.objects (bucket_id, name, metadata)
values (
  'knowledge-raw',
  '61000000-0000-0000-0000-000000000001/62000000-0000-0000-0000-000000000001/source.pdf',
  '{"mimetype":"application/pdf"}'::jsonb
);

set local role anon;
select is((select count(*) from public.knowledge_public_documents), 1::bigint, 'anonymous can read the published knowledge view');
select throws_ok(
  $$ select count(*) from public.knowledge_documents $$,
  '42501', null, 'anonymous cannot read internal document identities'
);
select throws_ok(
  $$ select count(*) from public.knowledge_document_versions $$,
  '42501', null, 'anonymous cannot read immutable source text tables'
);
select throws_ok(
  $$ select count(*) from public.favorites $$,
  '42501', null, 'anonymous cannot read account favorites'
);
reset role;

select tests.authenticate_as('60000000-0000-0000-0000-000000000001');
select is((select count(*) from public.knowledge_public_documents), 1::bigint, 'authenticated owner reads the published view');
select throws_ok(
  $$ select count(*) from public.knowledge_chunks $$,
  '42501', null, 'authenticated clients cannot read internal chunks directly'
);
select lives_ok(
  $$ insert into public.favorites (owner_id, document_id)
     values ('60000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000001') $$,
  'authenticated owner can add an own favorite'
);
select is((select count(*) from public.favorites), 1::bigint, 'owner sees its own favorite');
select throws_ok(
  $$ insert into public.favorites (owner_id, document_id)
     values ('60000000-0000-0000-0000-000000000002', '63000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'owner cannot forge another account favorite'
);
select is_empty(
  $$ select name from storage.objects where bucket_id = 'knowledge-raw' $$,
  'raw source objects require the authenticated signed-URL function and are not directly readable'
);

reset role;
select * from finish();
rollback;
