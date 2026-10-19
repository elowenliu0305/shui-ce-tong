begin;

create index knowledge_versions_title_trgm_idx on public.knowledge_document_versions
using gin (title extensions.gin_trgm_ops);
create index knowledge_versions_number_trgm_idx on public.knowledge_document_versions
using gin (document_number extensions.gin_trgm_ops);
create index knowledge_chunks_search_vector_idx on public.knowledge_chunks using gin (search_vector);
create index chunk_embeddings_hnsw_idx on public.chunk_embeddings
using hnsw (embedding extensions.vector_cosine_ops) with (m = 16, ef_construction = 64);

create or replace function public.activate_embedding_generation(p_generation_id uuid)
returns public.embedding_generations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_generation public.embedding_generations%rowtype;
  v_chunk_count bigint;
  v_embedding_count bigint;
begin
  select * into v_generation from public.embedding_generations where id = p_generation_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'generation_not_found'; end if;
  if v_generation.status not in ('building', 'validating') then
    raise exception using errcode = '55000', message = 'generation_not_activatable';
  end if;
  select count(*) into v_chunk_count from public.knowledge_chunks;
  select count(*) into v_embedding_count from public.chunk_embeddings where generation_id = p_generation_id;
  if v_chunk_count = 0 or v_embedding_count <> v_chunk_count then
    raise exception using errcode = '22023', message = 'generation_incomplete';
  end if;

  update public.embedding_generations set status = 'retired' where status = 'active';
  update public.embedding_generations
  set status = 'active', activated_at = timezone('utc', now()),
      validation_summary = jsonb_build_object('chunkCount', v_chunk_count, 'embeddingCount', v_embedding_count)
  where id = p_generation_id
  returning * into v_generation;
  return v_generation;
end;
$$;

create or replace function public.hybrid_search(
  p_query text,
  p_query_tokens text[],
  p_query_embedding extensions.vector(1024),
  p_kind text default null,
  p_reliable boolean default false,
  p_as_of_date date default current_date,
  p_limit integer default 8
)
returns table (
  citation_id uuid,
  document_id uuid,
  document_version_id uuid,
  chunk_id uuid,
  title text,
  document_number text,
  issuer text[],
  category text,
  validity_status text,
  review_status text,
  heading_path text[],
  char_start integer,
  char_end integer,
  excerpt text,
  fused_score double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select c.*, v.document_id, v.title, v.document_number, v.issuer,
      v.validity_status, v.review_status, v.effective_from, v.effective_to, d.category
    from public.knowledge_chunks c
    join public.knowledge_document_versions v on v.id = c.document_version_id
    join public.knowledge_documents d on d.id = v.document_id and d.current_version_id = v.id
    where d.visibility = 'published'
      and v.review_status <> 'rejected'
      and (p_kind is null or p_kind = 'all' or d.category = p_kind)
      and (
        not p_reliable or (
          v.review_status = 'verified'
          and v.validity_status in ('current', 'partially_effective')
          and (v.effective_from is null or v.effective_from <= p_as_of_date)
          and (v.effective_to is null or v.effective_to >= p_as_of_date)
        )
      )
  ),
  metadata_rank as (
    select id, row_number() over (order by
      greatest(
        extensions.similarity(title, p_query),
        extensions.similarity(coalesce(document_number, ''), p_query),
        extensions.similarity(array_to_string(issuer, ' '), p_query)
      ) desc
    ) as rank
    from eligible
    where p_query <> '' and (
      title % p_query or coalesce(document_number, '') % p_query
      or array_to_string(issuer, ' ') ilike '%' || p_query || '%'
    )
    limit 60
  ),
  lexical_rank as (
    select id, row_number() over (order by ts_rank_cd(search_vector, to_tsquery('simple', array_to_string(p_query_tokens, ' & '))) desc) as rank
    from eligible
    where coalesce(array_length(p_query_tokens, 1), 0) > 0
      and search_vector @@ to_tsquery('simple', array_to_string(p_query_tokens, ' & '))
    limit 60
  ),
  semantic_rank as (
    select e.id, row_number() over (order by ce.embedding <=> p_query_embedding) as rank
    from eligible e
    join public.chunk_embeddings ce on ce.chunk_id = e.id
    join public.embedding_generations g on g.id = ce.generation_id and g.status = 'active'
    where p_query_embedding is not null
    limit 60
  ),
  candidate_ids as (
    select id from metadata_rank union select id from lexical_rank union select id from semantic_rank
  ),
  fused as (
    select ids.id,
      coalesce(1.2 / (50 + mr.rank), 0) +
      coalesce(1.2 / (50 + lr.rank), 0) +
      coalesce(1.0 / (50 + sr.rank), 0) as score
    from candidate_ids ids
    left join metadata_rank mr on mr.id = ids.id
    left join lexical_rank lr on lr.id = ids.id
    left join semantic_rank sr on sr.id = ids.id
  ),
  deduped as (
    select e.*, f.score,
      row_number() over (partition by e.document_id order by f.score desc, e.ordinal) as document_rank
    from fused f join eligible e on e.id = f.id
  )
  select deduped.id, document_id, document_version_id, deduped.id, title, document_number, issuer,
    category, validity_status, review_status, heading_path, char_start, char_end,
    left(content, 360), score
  from deduped
  where document_rank <= 2
  order by score desc, title, ordinal
  limit greatest(1, least(p_limit, 20));
$$;

revoke all on function public.activate_embedding_generation(uuid) from public, anon, authenticated;
revoke all on function public.hybrid_search(text, text[], extensions.vector, text, boolean, date, integer) from public, anon, authenticated;
grant execute on function public.activate_embedding_generation(uuid) to service_role;
grant execute on function public.hybrid_search(text, text[], extensions.vector, text, boolean, date, integer) to service_role;

commit;
