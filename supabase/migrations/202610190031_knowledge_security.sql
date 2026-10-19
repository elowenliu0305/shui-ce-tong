begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge-raw',
  'knowledge-raw',
  false,
  67108864,
  array[
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'multipart/related',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.knowledge_import_batches enable row level security;
alter table public.knowledge_source_objects enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_document_versions enable row level security;
alter table public.knowledge_version_sources enable row level security;
alter table public.knowledge_document_relations enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.embedding_generations enable row level security;
alter table public.chunk_embeddings enable row level security;
alter table public.favorites enable row level security;

alter table public.knowledge_import_batches force row level security;
alter table public.knowledge_source_objects force row level security;
alter table public.knowledge_documents force row level security;
alter table public.knowledge_document_versions force row level security;
alter table public.knowledge_version_sources force row level security;
alter table public.knowledge_document_relations force row level security;
alter table public.knowledge_chunks force row level security;
alter table public.embedding_generations force row level security;
alter table public.chunk_embeddings force row level security;
alter table public.favorites force row level security;

revoke all on public.knowledge_import_batches, public.knowledge_source_objects,
  public.knowledge_documents, public.knowledge_document_versions,
  public.knowledge_version_sources, public.knowledge_document_relations,
  public.knowledge_chunks, public.embedding_generations, public.chunk_embeddings,
  public.favorites from anon, authenticated;

grant select, insert, delete on public.favorites to authenticated;
create policy favorites_select_own on public.favorites for select to authenticated using (owner_id = auth.uid());
create policy favorites_insert_own on public.favorites for insert to authenticated with check (owner_id = auth.uid());
create policy favorites_delete_own on public.favorites for delete to authenticated using (owner_id = auth.uid());

create or replace view public.knowledge_public_documents as
select
  d.id,
  d.stable_slug,
  d.category,
  d.visibility,
  v.id as version_id,
  v.version_no,
  v.title,
  v.document_number,
  v.issuer,
  v.published_on,
  v.effective_from,
  v.effective_to,
  v.validity_status,
  v.summary,
  v.body_text,
  coalesce(v.parser_manifest->>'status', case when v.body_text is null then 'failed' else 'parsed' end) as parse_status,
  v.review_status,
  v.source_url,
  v.created_at,
  coalesce((
    select array_agg(kvs.source_object_id order by kvs.source_object_id)
    from public.knowledge_version_sources kvs
    where kvs.document_version_id = v.id
  ), '{}'::uuid[]) as source_ids
from public.knowledge_documents d
join public.knowledge_document_versions v on v.id = d.current_version_id
where d.visibility = 'published' and v.review_status <> 'rejected';

revoke all on public.knowledge_public_documents from public;
grant select on public.knowledge_public_documents to anon, authenticated;

commit;
