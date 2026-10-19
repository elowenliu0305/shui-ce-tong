begin;

create table public.knowledge_import_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  manifest_name text not null,
  archive_sha256 text not null,
  expected_count integer not null check (expected_count >= 0),
  observed_count integer not null default 0 check (observed_count >= 0),
  status text not null default 'discovered' check (status in ('discovered', 'importing', 'reconciling', 'completed', 'failed')),
  error_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  unique (archive_sha256),
  constraint knowledge_batch_error_is_object check (jsonb_typeof(error_summary) = 'object')
);

create table public.knowledge_source_objects (
  id uuid primary key default extensions.gen_random_uuid(),
  batch_id uuid not null references public.knowledge_import_batches(id) on delete cascade,
  relative_path text not null,
  original_name text not null,
  detected_mime text,
  byte_size bigint not null check (byte_size >= 0),
  sha256 text,
  storage_key text,
  parse_status text not null default 'pending' check (parse_status in ('pending', 'processing', 'parsed', 'partial', 'failed', 'unsupported', 'encrypted')),
  duplicate_status text not null default 'unique' check (duplicate_status in ('unique', 'exact', 'body_exact', 'suspected')),
  duplicate_of_id uuid references public.knowledge_source_objects(id),
  review_status text not null default 'pending' check (review_status in ('pending', 'verified', 'rejected')),
  error_code text,
  parser_manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (batch_id, relative_path),
  constraint source_sha_present_for_nonempty check (byte_size = 0 or sha256 is not null),
  constraint source_parser_manifest_is_object check (jsonb_typeof(parser_manifest) = 'object')
);

create table public.knowledge_documents (
  id uuid primary key default extensions.gen_random_uuid(),
  stable_slug text not null unique,
  category text not null check (category in ('policy', 'news', 'case', 'other')),
  current_version_id uuid,
  visibility text not null default 'published' check (visibility in ('draft', 'published', 'withdrawn')),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.knowledge_document_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  title text not null,
  document_number text,
  issuer text[] not null default '{}',
  published_on date,
  effective_from date,
  effective_to date,
  validity_status text not null default 'unknown' check (validity_status in ('current', 'partially_effective', 'superseded', 'repealed', 'unknown')),
  region_codes text[] not null default '{}',
  industry_codes text[] not null default '{}',
  summary text,
  body_text text,
  body_hash text,
  metadata_hash text not null,
  source_url text,
  review_status text not null default 'pending' check (review_status in ('pending', 'verified', 'rejected')),
  parser_manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (document_id, version_no),
  constraint knowledge_version_effective_range check (effective_to is null or effective_from is null or effective_to >= effective_from),
  constraint knowledge_version_parser_manifest_is_object check (jsonb_typeof(parser_manifest) = 'object')
);

alter table public.knowledge_documents
  add constraint knowledge_documents_current_version_fk
  foreign key (current_version_id) references public.knowledge_document_versions(id)
  deferrable initially deferred;

alter table public.policy_rule_releases
  add constraint policy_rule_knowledge_version_fk
  foreign key (knowledge_document_version_id) references public.knowledge_document_versions(id);

create table public.knowledge_version_sources (
  document_version_id uuid not null references public.knowledge_document_versions(id) on delete cascade,
  source_object_id uuid not null references public.knowledge_source_objects(id) on delete restrict,
  relation text not null check (relation in ('primary', 'duplicate', 'attachment', 'reference')),
  primary key (document_version_id, source_object_id)
);

create table public.knowledge_document_relations (
  from_version_id uuid not null references public.knowledge_document_versions(id) on delete cascade,
  to_version_id uuid not null references public.knowledge_document_versions(id) on delete cascade,
  relation_type text not null check (relation_type in ('supersedes', 'superseded_by', 'amends', 'related')),
  review_status text not null default 'pending' check (review_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (from_version_id, to_version_id, relation_type),
  constraint knowledge_relation_not_self check (from_version_id <> to_version_id)
);

create table public.knowledge_chunks (
  id uuid primary key default extensions.gen_random_uuid(),
  document_version_id uuid not null references public.knowledge_document_versions(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  heading_path text[] not null default '{}',
  paragraph_start integer not null check (paragraph_start >= 0),
  paragraph_end integer not null check (paragraph_end >= paragraph_start),
  char_start integer not null check (char_start >= 0),
  char_end integer not null check (char_end >= char_start),
  page_start integer,
  page_end integer,
  content text not null,
  content_hash text not null,
  search_tokens text[] not null default '{}',
  search_vector tsvector generated always as (array_to_tsvector(search_tokens)) stored,
  created_at timestamptz not null default timezone('utc', now()),
  unique (document_version_id, ordinal),
  constraint knowledge_chunk_page_range check (page_end is null or page_start is null or page_end >= page_start)
);

create table public.embedding_generations (
  id uuid primary key default extensions.gen_random_uuid(),
  model_name text not null,
  model_revision text not null,
  dimension integer not null check (dimension = 1024),
  normalized boolean not null default true,
  chunking_version text not null,
  status text not null default 'building' check (status in ('building', 'validating', 'active', 'retired', 'failed')),
  validation_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  activated_at timestamptz,
  constraint embedding_validation_summary_is_object check (jsonb_typeof(validation_summary) = 'object')
);

create unique index one_active_embedding_generation on public.embedding_generations ((status)) where status = 'active';

create table public.chunk_embeddings (
  chunk_id uuid not null references public.knowledge_chunks(id) on delete cascade,
  generation_id uuid not null references public.embedding_generations(id) on delete cascade,
  embedding extensions.vector(1024) not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (chunk_id, generation_id)
);

alter table public.catalog_releases
  add constraint catalog_knowledge_generation_fk
  foreign key (knowledge_generation_id) references public.embedding_generations(id);

create table public.favorites (
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (owner_id, document_id)
);

create index knowledge_source_batch_status_idx on public.knowledge_source_objects (batch_id, parse_status);
create index knowledge_source_sha_idx on public.knowledge_source_objects (sha256) where sha256 is not null;
create index knowledge_versions_document_idx on public.knowledge_document_versions (document_id, version_no desc);
create index knowledge_versions_doc_number_idx on public.knowledge_document_versions (document_number) where document_number is not null;
create index knowledge_chunks_version_idx on public.knowledge_chunks (document_version_id, ordinal);
create index chunk_embeddings_generation_idx on public.chunk_embeddings (generation_id, chunk_id);

create trigger knowledge_versions_immutable before update or delete on public.knowledge_document_versions
for each row execute function private.reject_immutable_change();

commit;
