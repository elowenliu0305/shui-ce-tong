import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { handleRequest, HttpError } from "../_shared/http.ts";
import { logEvent } from "../_shared/logging.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

interface DeleteRequest {
  enterpriseId?: string;
  confirmation?: string;
}

async function countRows(client: ReturnType<typeof createServiceClient>, table: string, enterpriseId: string): Promise<number> {
  const { count, error } = await client.from(table).select("id", { count: "exact", head: true }).eq("enterprise_id", enterpriseId);
  if (error?.code === "42P01") return 0;
  if (error) throw new HttpError(503, "dependency_unavailable", "删除清点暂时失败，请稍后重试。", true);
  return count ?? 0;
}

async function listStoragePaths(
  client: ReturnType<typeof createServiceClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    if (/bucket not found/i.test(error.message)) return [];
    throw new HttpError(503, "dependency_unavailable", "文件清理暂时失败，请稍后重试。", true);
  }

  const paths: string[] = [];
  for (const entry of data ?? []) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id) paths.push(path);
    else paths.push(...await listStoragePaths(client, bucket, path));
  }
  return paths;
}

Deno.serve((request) => handleRequest(request, async ({ requestId }) => {
  if (request.method !== "POST") throw new HttpError(405, "validation_failed", "仅支持 POST 请求。", false);
  const { user, client: userClient } = await requireUser(request);
  enforceRateLimit(`delete-enterprise:${user.id}`, { limit: 5, windowMs: 60_000 });
  const body = await request.json() as DeleteRequest;
  if (!body.enterpriseId || body.confirmation !== "DELETE") {
    throw new HttpError(400, "validation_failed", "删除确认无效。", false);
  }

  const { data: jobId, error: revokeError } = await userClient.rpc("revoke_enterprise_for_deletion", {
    p_enterprise_id: body.enterpriseId,
  });
  if (revokeError) {
    if (revokeError.code === "P0002") throw new HttpError(404, "not_found", "企业不存在或已删除。", false);
    throw new HttpError(503, "dependency_unavailable", "企业暂时无法删除，请稍后重试。", true);
  }

  const admin = createServiceClient();
  await admin.from("deletion_jobs").update({ status: "running", attempt_count: 1 }).eq("id", jobId).eq("owner_id", user.id);

  try {
    const [deletedProfileDrafts, deletedRiskDrafts, deletedReports, deletedConversations, deletedFileRecords] = await Promise.all([
      countRows(admin, "company_profile_drafts", body.enterpriseId),
      countRows(admin, "questionnaire_drafts", body.enterpriseId),
      countRows(admin, "report_snapshots", body.enterpriseId),
      countRows(admin, "agent_conversations", body.enterpriseId),
      countRows(admin, "file_analysis_records", body.enterpriseId),
    ]);

    const storagePrefix = `${user.id}/${body.enterpriseId}`;
    const storagePaths = await listStoragePaths(admin, "enterprise-files", storagePrefix);
    if (storagePaths.length) {
      const { error } = await admin.storage.from("enterprise-files").remove(storagePaths);
      if (error) throw new HttpError(503, "dependency_unavailable", "文件清理暂时失败，请稍后重试。", true);
    }

    const { error: deleteError } = await admin.from("enterprises").delete().eq("id", body.enterpriseId).eq("owner_id", user.id);
    if (deleteError) throw new HttpError(503, "dependency_unavailable", "企业数据清理暂时失败，请稍后重试。", true);

    const { data: profile } = await admin.from("account_profiles").select("current_enterprise_id").eq("user_id", user.id).single();
    const { count: preservedFavorites } = await admin.from("favorites").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
    const result = {
      enterpriseId: body.enterpriseId,
      deletedProfileDrafts,
      deletedRiskDrafts,
      deletedReports,
      deletedConversations,
      deletedFileRecords,
      preservedFavorites: preservedFavorites ?? 0,
      activeEnterpriseId: profile?.current_enterprise_id ?? null,
    };

    await admin.from("deletion_jobs").update({ status: "completed", completed_at: new Date().toISOString(), result_summary: result }).eq("id", jobId);
    logEvent("info", "enterprise.delete.completed", { requestId, ownerId: user.id, enterpriseId: body.enterpriseId, counts: result });
    return result;
  } catch (error) {
    await admin.from("deletion_jobs").update({
      status: "failed",
      last_error_code: error instanceof HttpError ? error.code : "internal_error",
    }).eq("id", jobId);
    logEvent("error", "enterprise.delete.failed", { requestId, ownerId: user.id, enterpriseId: body.enterpriseId });
    throw error;
  }
}));
