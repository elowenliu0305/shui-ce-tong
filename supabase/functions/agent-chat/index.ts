import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { handleRequest, HttpError } from "../_shared/http.ts";
import { logEvent } from "../_shared/logging.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { buildEnterpriseContext } from "./context-builder.ts";
import { runAgentTurn } from "./orchestrator.ts";
import type { AgentSearchCitation, PreparedAgentAnswer } from "./answer-policy.ts";

interface AgentChatRequest {
  enterpriseId?: string;
  conversationId?: string;
  reportId?: string;
  knowledgeDocumentId?: string;
  message?: string;
  idempotencyKey?: string;
}

interface PersistedConversation {
  id: string;
  messages: Array<{
    id: string;
    role: string;
    intent: string | null;
    status: string;
    content: string;
    errorStage: string | null;
    toolsUsed: string[];
    suggestedQuestions: string[];
    citations: AgentSearchCitation[];
  }>;
}

interface PersistResult {
  conversation: PersistedConversation;
  assistantMessageId: string;
  replayed: boolean;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateBody(body: AgentChatRequest): asserts body is AgentChatRequest & {
  enterpriseId: string;
  message: string;
  idempotencyKey: string;
} {
  const optionalIds = [body.conversationId, body.reportId, body.knowledgeDocumentId].filter(Boolean) as string[];
  if (!body.enterpriseId || !uuidPattern.test(body.enterpriseId)
    || optionalIds.some((value) => !uuidPattern.test(value))
    || !body.message?.trim() || body.message.trim().length > 8000
    || !body.idempotencyKey || body.idempotencyKey.length < 16 || body.idempotencyKey.length > 128) {
    throw new HttpError(400, "validation_failed", "问答参数不完整。", false);
  }
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function responseFromPersisted(result: PersistResult) {
  const assistant = result.conversation.messages.find((message) => message.id === result.assistantMessageId)
    ?? [...result.conversation.messages].reverse().find((message) => message.role === "assistant");
  if (!assistant) throw new HttpError(503, "dependency_unavailable", "会话保存结果不完整。", true);
  return {
    conversationId: result.conversation.id,
    messageId: assistant.id,
    status: assistant.status,
    intent: assistant.intent,
    content: assistant.content,
    citations: assistant.citations ?? [],
    toolsUsed: assistant.toolsUsed ?? [],
    suggestedQuestions: assistant.suggestedQuestions ?? [],
    errorStage: assistant.errorStage,
    replayed: result.replayed,
  };
}

async function existingExchange(
  admin: ReturnType<typeof createServiceClient>,
  ownerId: string,
  enterpriseId: string,
  idempotencyKey: string,
  requestHash: string,
) {
  const existing = await admin.from("agent_messages")
    .select("id, conversation_id, request_hash")
    .eq("owner_id", ownerId).eq("enterprise_id", enterpriseId)
    .eq("role", "user").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing.error) throw new HttpError(503, "dependency_unavailable", "会话幂等校验失败。", true);
  if (!existing.data) return null;
  if (existing.data.request_hash !== requestHash) throw new HttpError(409, "idempotency_mismatch", "重复请求内容不一致。", false);
  const conversation = await admin.rpc("get_agent_conversation_for_service", {
    p_conversation_id: existing.data.conversation_id,
    p_owner_id: ownerId,
    p_enterprise_id: enterpriseId,
  });
  if (conversation.error || !conversation.data) throw new HttpError(503, "dependency_unavailable", "历史回答读取失败。", true);
  const assistant = (conversation.data as PersistedConversation).messages.find((message) => message.role === "assistant" && message.id)
    ?? null;
  const reply = await admin.from("agent_messages").select("id").eq("reply_to_message_id", existing.data.id).eq("role", "assistant").maybeSingle();
  if (reply.error || !reply.data || !assistant) throw new HttpError(503, "dependency_unavailable", "历史回答尚未完成。", true);
  return responseFromPersisted({ conversation: conversation.data as PersistedConversation, assistantMessageId: reply.data.id, replayed: true });
}

function knowledgeSearchUrl(): string {
  const runtime = globalThis as typeof globalThis & { Deno?: { env: { get(name: string): string | undefined } } };
  const base = runtime.Deno?.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  if (!base) throw new Error("supabase_url_missing");
  return `${base}/functions/v1/knowledge-search`;
}

async function retrieveReliable(request: Request, query: string, documentId?: string | null): Promise<AgentSearchCitation[]> {
  const response = await fetch(knowledgeSearchUrl(), {
    method: "POST",
    headers: {
      Authorization: request.headers.get("authorization") ?? "",
      apikey: request.headers.get("apikey") ?? "",
      "Content-Type": "application/json",
      "X-Request-Id": crypto.randomUUID(),
    },
    body: JSON.stringify({ query, mode: "reliable_tax", asOfDate: new Date().toISOString().slice(0, 10), limit: 10 }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json() as { items?: AgentSearchCitation[]; error?: unknown };
  if (!response.ok || body.error || !Array.isArray(body.items)) throw new Error("retrieval_unavailable");
  const filtered = documentId ? body.items.filter((item) => item.documentId === documentId) : body.items;
  return filtered.slice(0, 8).map((item, index) => ({ ...item, score: Number(item.score), rank: index + 1 } as AgentSearchCitation));
}

function persistencePayload(answer: PreparedAgentAnswer, durations: { total: number }) {
  return {
    intent: answer.intent,
    status: answer.status,
    content: answer.content,
    errorStage: answer.errorStage,
    toolsUsed: answer.toolsUsed,
    suggestedQuestions: answer.suggestedQuestions,
    toolCalls: answer.toolsUsed.map((name) => ({
      name: name.replace(/:error$/, ""),
      status: name.endsWith(":error") ? "failed" : answer.status === "insufficient_evidence" ? "empty" : "completed",
      durationMs: durations.total,
      summary: { status: answer.status },
    })),
  };
}

Deno.serve((request) => handleRequest(request, async ({ requestId }) => {
  if (request.method !== "POST") throw new HttpError(405, "validation_failed", "仅支持 POST 请求。", false);
  const { user } = await requireUser(request);
  enforceRateLimit(`agent-chat:${user.id}`, { limit: 20, windowMs: 60_000 });
  const body = await request.json() as AgentChatRequest;
  validateBody(body);
  const message = body.message.trim();
  const requestHash = await sha256({
    enterpriseId: body.enterpriseId,
    conversationId: body.conversationId ?? null,
    reportId: body.reportId ?? null,
    knowledgeDocumentId: body.knowledgeDocumentId ?? null,
    message,
  });
  const admin = createServiceClient();
  const replay = await existingExchange(admin, user.id, body.enterpriseId, body.idempotencyKey, requestHash);
  if (replay) return replay;

  const enterprise = await admin.from("enterprises").select("id").eq("id", body.enterpriseId)
    .eq("owner_id", user.id).eq("deletion_state", "active").maybeSingle();
  if (enterprise.error || !enterprise.data) throw new HttpError(404, "not_found", "企业不存在或已删除。", false);
  const profile = await admin.from("account_profiles").select("current_enterprise_id")
    .eq("user_id", user.id).eq("current_enterprise_id", body.enterpriseId).maybeSingle();
  if (profile.error || !profile.data) throw new HttpError(404, "not_found", "请先切换到对应企业。", false);
  if (body.conversationId) {
    const conversation = await admin.from("agent_conversations").select("id").eq("id", body.conversationId)
      .eq("owner_id", user.id).eq("enterprise_id", body.enterpriseId).eq("status", "active").maybeSingle();
    if (conversation.error || !conversation.data) throw new HttpError(404, "not_found", "会话不存在。", false);
  }

  const started = Date.now();
  const answer = await runAgentTurn(
    { message, reportId: body.reportId, knowledgeDocumentId: body.knowledgeDocumentId },
    {
      retrieveReliable: (query, documentId) => retrieveReliable(request, query, documentId),
      buildContext: async () => buildEnterpriseContext(
        admin as unknown as Parameters<typeof buildEnterpriseContext>[0],
        user.id,
        body.enterpriseId,
        body.reportId,
      ),
    },
  );
  const contextManifest = {
    intent: answer.intent,
    reportId: body.reportId ?? null,
    knowledgeDocumentId: body.knowledgeDocumentId ?? null,
    contextFields: answer.intent === "enterprise_report"
      ? ["region", "industry", "profile.allowedFields", "report.riskSummary", "report.priorityActions", "report.versions"]
      : [],
    evidenceIds: answer.citations.map((citation) => citation.citationId),
  };
  const persisted = await admin.rpc("persist_agent_exchange", {
    p_owner_id: user.id,
    p_enterprise_id: body.enterpriseId,
    p_conversation_id: body.conversationId ?? null,
    p_report_snapshot_id: body.reportId ?? null,
    p_knowledge_document_id: body.knowledgeDocumentId ?? null,
    p_title: message.slice(0, 28),
    p_idempotency_key: body.idempotencyKey,
    p_request_hash: requestHash,
    p_user_content: message,
    p_assistant: persistencePayload(answer, { total: Date.now() - started }),
    p_citations: answer.citations.map((citation, index) => ({ ...citation, rank: index + 1 })),
    p_context_manifest: contextManifest,
    p_request_id: requestId,
  });
  if (persisted.error || !persisted.data) {
    const code = persisted.error?.code;
    if (code === "23505") throw new HttpError(409, "idempotency_mismatch", "重复请求内容不一致。", false);
    if (code === "P0002") throw new HttpError(404, "not_found", "企业、报告或会话不存在。", false);
    logEvent("error", "agent.persist.failed", { requestId, ownerId: user.id, enterpriseId: body.enterpriseId, code });
    throw new HttpError(503, "dependency_unavailable", "回答保存失败，使用原请求可安全重试。", true);
  }
  const result = responseFromPersisted(persisted.data as PersistResult);
  logEvent("info", "agent.exchange.completed", {
    requestId,
    ownerId: user.id,
    enterpriseId: body.enterpriseId,
    conversationId: result.conversationId,
    intent: result.intent,
    status: result.status,
    citationCount: result.citations.length,
    replayed: result.replayed,
  });
  return result;
}));
