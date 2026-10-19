# Knowledge Ingestion Contract

## Inputs

- Archive path or manifest directory under operator control.
- Batch metadata: source name, received date, expected item count, optional default category.
- Environment with Supabase service credential and Embedding provider credential; neither may be printed.

## Safety checks before extraction

1. Reject absolute paths, `..`, symlinks escaping the extraction root and duplicate normalized paths.
2. Enforce maximum archive bytes, member count, per-member bytes and expansion ratio.
3. Detect MIME by magic bytes; keep original extension only as metadata.
4. Compute archive and member SHA-256 before parsing.
5. Preserve a source-object row for every member, including empty, unsupported, encrypted and failed items.

## Pipeline

```text
discover -> register source objects -> upload raw -> parse -> normalize
-> exact/near duplicate analysis -> create immutable document version
-> structure-aware chunk -> tokenize -> embed pending chunks
-> validate generation -> activate -> reconcile batch counts
```

## Parsing result

Each source returns one of:

- `parsed`: usable body and metadata.
- `partial`: some body/metadata recovered; limitations listed.
- `failed`: no trustworthy body; original remains downloadable.
- `unsupported` or `encrypted`: explicit terminal state.

Parser output MUST include parser name/version, warnings, extracted metadata, normalized text hash, page mapping confidence and source ID.

## Chunk result

Each chunk includes document version, ordinal, heading path, paragraph/character offsets, optional reliable page range, content, content hash and build-time Chinese search tokens. Target 450–800 Chinese characters with 80–120 overlap; never split a clause if a nearby structural boundary exists.

## Duplicate policy

- Same binary SHA-256: link as exact duplicate, keep both source rows.
- Same normalized body hash: attach to same version only when metadata does not conflict.
- Similar content/title: mark suspected duplicate for review; never auto-verify or overwrite.

## Activation gate

A batch/generation can activate only when:

- observed source count equals manifest count;
- every source has a terminal parse status;
- every published version has at least one source;
- every searchable chunk in the generation has the expected embedding dimension;
- golden search and citation locator checks pass;
- policy rules referencing versions still resolve.

Rollback switches the active generation pointer; it does not delete raw sources or document versions.

