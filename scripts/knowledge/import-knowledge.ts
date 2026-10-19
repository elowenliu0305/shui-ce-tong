import { createHash } from "node:crypto";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { chunkKnowledgeDocument } from "./chunk-document";
import { forEachKnowledgeArchiveMember, scanKnowledgeArchive, type ManifestSource } from "./import-manifest";
import { parseKnowledgeSource, type ParsedSource } from "./parse-source";

interface RegisteredSource extends ManifestSource {
  id: string;
  storageKey: string | null;
}

function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function parserManifest(parsed: ParsedSource) {
  return {
    status: parsed.status,
    parserName: parsed.parserName,
    parserVersion: parsed.parserVersion,
    warnings: parsed.warnings,
    normalizedTextSha256: parsed.normalizedTextSha256,
    pageMappingConfidence: parsed.pageMappingConfidence,
    metadata: parsed.metadata,
  };
}

type OperationResult<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>;

function typed<T>(operation: unknown): OperationResult<T> {
  return operation as OperationResult<T>;
}

async function must<T>(operation: OperationResult<T>, label: string): Promise<T | null> {
  const { data, error } = await operation;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function requiredData<T>(operation: OperationResult<T>, label: string): Promise<T> {
  const data = await must(operation, label);
  if (data === null) throw new Error(`${label}: 未返回数据`);
  return data;
}

async function attachDuplicate(
  client: SupabaseClient,
  source: RegisteredSource,
  duplicate: { id: string; storage_key: string | null; parse_status: string; parser_manifest: Record<string, unknown> },
) {
  const relation = await client.from("knowledge_version_sources")
    .select("document_version_id")
    .eq("source_object_id", duplicate.id)
    .limit(1)
    .maybeSingle();
  if (relation.error) throw new Error(`读取重复来源关系失败: ${relation.error.message}`);
  if (relation.data?.document_version_id) {
    await must(client.from("knowledge_version_sources").upsert({
      document_version_id: relation.data.document_version_id,
      source_object_id: source.id,
      relation: "duplicate",
    }), "关联重复来源");
  }
  await must(client.from("knowledge_source_objects").update({
    duplicate_status: "exact",
    duplicate_of_id: duplicate.id,
    storage_key: duplicate.storage_key,
    parse_status: duplicate.parse_status,
    parser_manifest: duplicate.parser_manifest,
  }).eq("id", source.id), "更新重复来源");
}

async function createDocumentVersion(client: SupabaseClient, source: RegisteredSource, parsed: ParsedSource) {
  if (parsed.normalizedTextSha256) {
    const bodyDuplicate = await client.from("knowledge_document_versions")
      .select("id, document_id, title, document_number")
      .eq("body_hash", parsed.normalizedTextSha256)
      .limit(1)
      .maybeSingle();
    if (bodyDuplicate.error) throw new Error(`正文重复检查失败: ${bodyDuplicate.error.message}`);
    if (bodyDuplicate.data
      && bodyDuplicate.data.title === parsed.metadata.title
      && (bodyDuplicate.data.document_number ?? null) === parsed.metadata.documentNumber) {
      await must(client.from("knowledge_version_sources").upsert({
        document_version_id: bodyDuplicate.data.id,
        source_object_id: source.id,
        relation: "duplicate",
      }), "关联正文重复来源");
      await must(client.from("knowledge_source_objects").update({ duplicate_status: "body_exact" }).eq("id", source.id), "更新正文重复状态");
      return;
    }
  }

  const identityHash = parsed.normalizedTextSha256 ?? source.sha256 ?? sha256(source.relativePath);
  const document = await requiredData(typed<{ id: string }>(client.from("knowledge_documents").insert({
    stable_slug: `source-${identityHash.slice(0, 24)}`,
    category: parsed.metadata.category,
    visibility: "published",
  }).select("id").single()), "创建资料身份");

  const metadataHash = sha256(JSON.stringify(parsed.metadata));
  const version = await requiredData(typed<{ id: string }>(client.from("knowledge_document_versions").insert({
    document_id: document.id,
    version_no: 1,
    title: parsed.metadata.title,
    document_number: parsed.metadata.documentNumber,
    issuer: parsed.metadata.issuer,
    published_on: parsed.metadata.publishedOn,
    validity_status: process.env.KNOWLEDGE_IMPORT_VALIDITY_STATUS ?? "unknown",
    summary: parsed.normalizedText?.slice(0, 280) ?? null,
    body_text: parsed.normalizedText,
    body_hash: parsed.normalizedTextSha256,
    metadata_hash: metadataHash,
    source_url: parsed.metadata.sourceUrl,
    review_status: process.env.KNOWLEDGE_IMPORT_REVIEW_STATUS ?? "pending",
    parser_manifest: parserManifest(parsed),
  }).select("id").single()), "创建不可变资料版本");

  await must(client.from("knowledge_documents").update({ current_version_id: version.id }).eq("id", document.id), "激活资料当前版本");
  await must(client.from("knowledge_version_sources").insert({ document_version_id: version.id, source_object_id: source.id, relation: "primary" }), "关联原始来源");

  if (parsed.normalizedText) {
    const chunks = chunkKnowledgeDocument(parsed.normalizedText).map((chunk) => ({
      document_version_id: version.id,
      ordinal: chunk.ordinal,
      heading_path: chunk.headingPath,
      paragraph_start: chunk.paragraphStart,
      paragraph_end: chunk.paragraphEnd,
      char_start: chunk.charStart,
      char_end: chunk.charEnd,
      content: chunk.content,
      content_hash: chunk.contentHash,
      search_tokens: chunk.searchTokens,
    }));
    for (let start = 0; start < chunks.length; start += 250) {
      await must(client.from("knowledge_chunks").insert(chunks.slice(start, start + 250)), "写入资料分块");
    }
  }
}

export async function importKnowledgeArchive(archivePath: string) {
  const manifest = await scanKnowledgeArchive(archivePath);
  if (manifest.rejectedCount) throw new Error(`清单中有 ${manifest.rejectedCount} 个成员未通过安全检查`);
  const client = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existingBatch = await client.from("knowledge_import_batches").select("id, status").eq("archive_sha256", manifest.archiveSha256).maybeSingle();
  if (existingBatch.error) throw new Error(`读取导入批次失败: ${existingBatch.error.message}`);
  if (existingBatch.data?.status === "completed") return { batchId: existingBatch.data.id, manifest, replayed: true };
  const batch = existingBatch.data ?? await requiredData(typed<{ id: string; status: string }>(client.from("knowledge_import_batches").insert({
    manifest_name: manifest.archiveName,
    archive_sha256: manifest.archiveSha256,
    expected_count: manifest.observedCount,
    observed_count: manifest.observedCount,
    status: "importing",
  }).select("id, status").single()), "创建资料导入批次");

  const registered = await requiredData(typed<Array<{ id: string; relative_path: string; storage_key: string | null }>>(client.from("knowledge_source_objects").upsert(manifest.sources.map((source) => ({
    batch_id: batch.id,
    relative_path: source.relativePath,
    original_name: source.originalName,
    detected_mime: source.detectedMime,
    byte_size: source.byteSize,
    sha256: source.sha256,
    parse_status: "pending",
  })), { onConflict: "batch_id,relative_path" }).select("id, relative_path, storage_key")), "登记逐文件来源清单");
  const rowByPath = new Map(registered.map((row) => [row.relative_path, row]));
  const sources = new Map(manifest.sources.map((source) => {
    const row = rowByPath.get(source.relativePath);
    if (!row) throw new Error(`来源登记缺失：${source.relativePath}`);
    return [source.relativePath, { ...source, id: row.id, storageKey: row.storage_key } satisfies RegisteredSource];
  }));

  await forEachKnowledgeArchiveMember(archivePath, new Set(sources.keys()), async ({ relativePath, buffer }) => {
    const source = sources.get(relativePath);
    if (!source) throw new Error(`未登记来源：${relativePath}`);
    try {
      if (sha256(buffer) !== source.sha256) throw new Error("archive_member_hash_changed");
      const exact = await client.from("knowledge_source_objects")
        .select("id, storage_key, parse_status, parser_manifest")
        .eq("sha256", source.sha256)
        .neq("id", source.id)
        .in("parse_status", ["parsed", "partial", "failed"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (exact.error) throw new Error(`二进制重复检查失败: ${exact.error.message}`);
      if (exact.data) return await attachDuplicate(client, source, exact.data);

      // Supabase Storage 要求 key 为纯 ASCII（服务端会 URL 解码路径，中文/percent-encoding 均被拒）。
      // 对象名固定为 source；原始文件名存于 knowledge_source_objects.original_name，
      // 下载时由 knowledge-source-url 签名 URL 的 download 参数还原。
      const storageKey = source.storageKey ?? `${batch.id}/${source.id}/source`;
      if (!source.storageKey) {
        const uploaded = await client.storage.from("knowledge-raw").upload(storageKey, buffer, {
          contentType: source.detectedMime ?? "application/octet-stream",
          upsert: false,
        });
        if (uploaded.error && !/already exists|duplicate/i.test(uploaded.error.message)) throw new Error(`原文件上传失败: ${uploaded.error.message}`);
        await must(client.from("knowledge_source_objects").update({ storage_key: storageKey, parse_status: "processing" }).eq("id", source.id), "更新原文件位置");
      }

      const parsed = await parseKnowledgeSource({
        originalName: source.originalName,
        relativePath: source.relativePath,
        detectedMime: source.detectedMime ?? "application/octet-stream",
        buffer,
      });
      await createDocumentVersion(client, source, parsed);
      await must(client.from("knowledge_source_objects").update({
        parse_status: parsed.status,
        parser_manifest: parserManifest(parsed),
        error_code: parsed.errorCode,
      }).eq("id", source.id), "保存解析状态");
      process.stdout.write(`已处理 ${source.relativePath}\n`);
    } catch (error) {
      await client.from("knowledge_source_objects").update({
        parse_status: "failed",
        error_code: error instanceof Error ? error.message.slice(0, 100) : "import_failed",
      }).eq("id", source.id);
      process.stderr.write(`处理失败 ${source.relativePath}: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  });

  const reconciliation = await requiredData(typed<Array<{ id: string; parse_status: string }>>(client.from("knowledge_source_objects").select("id, parse_status").eq("batch_id", batch.id)), "读取批次对账");
  const terminal = new Set(["parsed", "partial", "failed", "unsupported", "encrypted"]);
  const completed = reconciliation.length === manifest.observedCount && reconciliation.every((row) => terminal.has(row.parse_status));
  await must(client.from("knowledge_import_batches").update({
    observed_count: reconciliation.length,
    status: completed ? "completed" : "failed",
    completed_at: new Date().toISOString(),
    error_summary: completed ? {} : { expected: manifest.observedCount, observed: reconciliation.length, nonTerminal: reconciliation.filter((row) => !terminal.has(row.parse_status)).length },
  }).eq("id", batch.id), "完成导入批次对账");
  return { batchId: batch.id, manifest, replayed: false, completed };
}

async function main() {
  const archivePath = argument("--archive") ?? process.argv[2];
  if (!archivePath) throw new Error("用法：npm run knowledge:import -- --archive <资料.zip>");
  if (process.argv.includes("--dry-run")) {
    const manifest = await scanKnowledgeArchive(archivePath);
    process.stdout.write(`${JSON.stringify({ archive: basename(archivePath), observed: manifest.observedCount, accepted: manifest.acceptedCount, rejected: manifest.rejectedCount, expandedBytes: manifest.expandedBytes }, null, 2)}\n`);
    return;
  }
  const result = await importKnowledgeArchive(archivePath);
  process.stdout.write(`${JSON.stringify({ batchId: result.batchId, fileCount: result.manifest.observedCount, replayed: result.replayed, completed: "completed" in result ? result.completed : true }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
