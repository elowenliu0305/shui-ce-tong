begin;

create or replace function public.validate_embedding_recall(
  p_query_embedding extensions.vector(1024),
  p_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_approx uuid[];
  v_exact uuid[];
  v_overlap integer;
begin
  if p_query_embedding is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'validation_failed';
  end if;
  select coalesce(array_agg(chunk_id order by distance), '{}') into v_approx
  from (
    select ce.chunk_id, ce.embedding <=> p_query_embedding as distance
    from public.chunk_embeddings ce
    join public.embedding_generations g on g.id = ce.generation_id and g.status = 'active'
    order by ce.embedding <=> p_query_embedding
    limit p_limit
  ) ranked;

  perform set_config('enable_indexscan', 'off', true);
  perform set_config('enable_bitmapscan', 'off', true);
  select coalesce(array_agg(chunk_id order by distance), '{}') into v_exact
  from (
    select ce.chunk_id, ce.embedding <=> p_query_embedding as distance
    from public.chunk_embeddings ce
    join public.embedding_generations g on g.id = ce.generation_id and g.status = 'active'
    order by ce.embedding <=> p_query_embedding
    limit p_limit
  ) ranked;

  select count(*) into v_overlap
  from unnest(v_approx) candidate where candidate = any(v_exact);
  return jsonb_build_object(
    'approximateIds', to_jsonb(v_approx),
    'exactIds', to_jsonb(v_exact),
    'overlapCount', v_overlap,
    'limit', p_limit,
    'recall', case when cardinality(v_exact) = 0 then 1 else v_overlap::double precision / cardinality(v_exact) end
  );
end;
$$;

revoke all on function public.validate_embedding_recall(extensions.vector, integer) from public, anon, authenticated;
grant execute on function public.validate_embedding_recall(extensions.vector, integer) to service_role;

commit;
