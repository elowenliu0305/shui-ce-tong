import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { handleRequest, HttpError } from "../_shared/http.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

Deno.serve((request) => handleRequest(request, async () => {
  if (request.method !== "POST") throw new HttpError(405, "validation_failed", "仅支持 POST 请求。", false);
  const { user } = await requireUser(request);
  enforceRateLimit(`knowledge-source-url:${user.id}`, { limit: 30, windowMs: 60_000 });
  const body = await request.json() as { documentId?: string };
  if (!body.documentId || !/^[0-9a-f-]{36}$/i.test(body.documentId)) throw new HttpError(400, "validation_failed", "资料参数不正确。", false);
  const admin = createServiceClient();
  const document = await admin.from("knowledge_documents").select("current_version_id").eq("id", body.documentId).eq("visibility", "published").maybeSingle();
  if (document.error || !document.data) throw new HttpError(404, "not_found", "资料不存在。", false);
  const relation = await admin.from("knowledge_version_sources").select("source_object_id").eq("document_version_id", document.data.current_version_id).order("relation").limit(1).maybeSingle();
  if (relation.error || !relation.data) throw new HttpError(404, "not_found", "原始来源不存在。", false);
  const source = await admin.from("knowledge_source_objects").select("original_name, detected_mime, storage_key").eq("id", relation.data.source_object_id).maybeSingle();
  if (source.error || !source.data?.storage_key) throw new HttpError(404, "not_found", "原始文件尚不可下载。", false);
  const signed = await admin.storage.from("knowledge-raw").createSignedUrl(source.data.storage_key, 120, { download: source.data.original_name });
  if (signed.error) throw new HttpError(503, "dependency_unavailable", "原始文件链接生成失败。", true);
  return { fileName: source.data.original_name, mimeType: source.data.detected_mime ?? "application/octet-stream", signedUrl: signed.data.signedUrl, expiresIn: 120 };
}));
