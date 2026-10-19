begin;
select plan(10);

insert into public.knowledge_documents (id, stable_slug, category, visibility) values
  ('70000000-0000-0000-0000-000000000001', 'search-current-rd', 'policy', 'published'),
  ('70000000-0000-0000-0000-000000000002', 'search-expired-rd', 'policy', 'published'),
  ('70000000-0000-0000-0000-000000000003', 'search-pending-rd', 'policy', 'published');

insert into public.knowledge_document_versions (
  id, document_id, version_no, title, document_number, issuer, published_on,
  effective_from, effective_to, validity_status, summary, body_text, body_hash,
  metadata_hash, review_status, parser_manifest
) values
  (
    '71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 1,
    '研发费用税前加计扣除政策指引', '国税发〔2026〕18号', array['国家税务总局'],
    '2026-01-01', '2026-01-01', null, 'current', '研发政策。', '企业应归集研发费用并留存备查资料。',
    repeat('1', 64), repeat('2', 64), 'verified', '{"status":"parsed"}'::jsonb
  ),
  (
    '71000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 1,
    '研发费用阶段性旧规定', '国税发〔2020〕9号', array['国家税务总局'],
    '2020-01-01', '2020-01-01', '2024-12-31', 'superseded', '旧政策。', '旧研发费用加计扣除规定。',
    repeat('3', 64), repeat('4', 64), 'verified', '{"status":"parsed"}'::jsonb
  ),
  (
    '71000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', 1,
    '研发费用待核验解读', '测试〔2026〕3号', array['未核验机构'],
    '2026-02-01', '2026-02-01', null, 'current', '待核验政策。', '研发费用待核验材料。',
    repeat('5', 64), repeat('6', 64), 'pending', '{"status":"parsed"}'::jsonb
  );

update public.knowledge_documents set current_version_id = case id
  when '70000000-0000-0000-0000-000000000001' then '71000000-0000-0000-0000-000000000001'::uuid
  when '70000000-0000-0000-0000-000000000002' then '71000000-0000-0000-0000-000000000002'::uuid
  else '71000000-0000-0000-0000-000000000003'::uuid end;

insert into public.knowledge_chunks (
  id, document_version_id, ordinal, heading_path, paragraph_start, paragraph_end,
  char_start, char_end, content, content_hash, search_tokens
) values
  (
    '72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 0,
    array['适用条件'], 0, 0, 0, 24, '企业应归集研发费用并留存备查资料。', repeat('7', 64),
    array['企业', '归集', '研发', '费用', '留存', '备查', '资料']
  ),
  (
    '72000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002', 0,
    array['旧规定'], 0, 0, 0, 18, '旧研发费用加计扣除规定。', repeat('8', 64),
    array['旧', '研发', '费用', '加计', '扣除']
  ),
  (
    '72000000-0000-0000-0000-000000000003', '71000000-0000-0000-0000-000000000003', 0,
    array['待核验'], 0, 0, 0, 14, '研发费用待核验材料。', repeat('9', 64),
    array['研发', '费用', '待核验', '材料']
  );

insert into public.embedding_generations (
  id, model_name, model_revision, dimension, normalized, chunking_version, status, activated_at
) values (
  '73000000-0000-0000-0000-000000000001', 'Qwen/Qwen3-Embedding-0.6B', 'test', 1024, true, 'test-v1', 'active', now()
);

insert into public.chunk_embeddings (chunk_id, generation_id, embedding) values
  (
    '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001',
    ('[' || '1,' || repeat('0,', 1022) || '0]')::extensions.vector
  ),
  (
    '72000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000001',
    ('[0,1,' || repeat('0,', 1021) || '0]')::extensions.vector
  ),
  (
    '72000000-0000-0000-0000-000000000003', '73000000-0000-0000-0000-000000000001',
    ('[0,1,' || repeat('0,', 1021) || '0]')::extensions.vector
  );

select ok(
  exists(select 1 from public.hybrid_search('研发费用税前加计扣除政策指引', array[]::text[], null::extensions.vector, 'policy', false, '2026-10-19', 10)
    where document_id = '70000000-0000-0000-0000-000000000001'),
  'exact title recall finds the current document'
);
select ok(
  exists(select 1 from public.hybrid_search('国税发〔2026〕18号', array[]::text[], null::extensions.vector, 'policy', false, '2026-10-19', 10)
    where document_id = '70000000-0000-0000-0000-000000000001'),
  'exact document-number recall finds the current document'
);
select ok(
  exists(select 1 from public.hybrid_search('国家税务总局', array[]::text[], null::extensions.vector, 'policy', false, '2026-10-19', 10)
    where document_id = '70000000-0000-0000-0000-000000000001'),
  'issuer metadata recall is available'
);
select ok(
  exists(select 1 from public.hybrid_search('', array['留存', '备查'], null::extensions.vector, 'policy', false, '2026-10-19', 10)
    where document_id = '70000000-0000-0000-0000-000000000001'),
  'Chinese lexical tokens recall body content'
);
select is(
  (select document_id from public.hybrid_search('', array[]::text[], ('[' || '1,' || repeat('0,', 1022) || '0]')::extensions.vector, 'policy', false, '2026-10-19', 1)),
  '70000000-0000-0000-0000-000000000001'::uuid,
  'semantic ranking returns the nearest vector first'
);
select is(
  (select document_id from public.hybrid_search('研发费用', array['研发', '费用'], ('[' || '1,' || repeat('0,', 1022) || '0]')::extensions.vector, 'policy', false, '2026-10-19', 1)),
  '70000000-0000-0000-0000-000000000001'::uuid,
  'RRF combines metadata, lexical and semantic ranks'
);
select ok(
  exists(select 1 from public.hybrid_search('研发费用', array['研发', '费用'], null::extensions.vector, 'policy', true, '2026-10-19', 10)
    where document_id = '70000000-0000-0000-0000-000000000001'),
  'reliable mode keeps verified currently effective evidence'
);
select is_empty(
  $$ select document_id from public.hybrid_search('旧规定', array['旧', '规定'], null::extensions.vector, 'policy', true, '2026-10-19', 10)
     where document_id = '70000000-0000-0000-0000-000000000002' $$,
  'reliable mode excludes superseded evidence'
);
select is_empty(
  $$ select document_id from public.hybrid_search('待核验', array['待核验'], null::extensions.vector, 'policy', true, '2026-10-19', 10)
     where document_id = '70000000-0000-0000-0000-000000000003' $$,
  'reliable mode excludes unverified evidence'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.hybrid_search(text,text[],extensions.vector,text,boolean,date,integer)',
    'execute'
  ),
  'browser clients cannot execute the privileged hybrid-search RPC directly'
);

select * from finish();
rollback;
