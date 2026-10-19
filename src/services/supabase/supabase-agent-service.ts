import type { AgentConversation, AgentIntent, AgentMessage, AgentRequest, AgentResponse, AgentStatus } from "../../domain/agent";
import type { Citation } from "../../domain/shared";
import type { AgentService } from "../contracts/agent-service";
import { failure, success } from "../contracts/service-result";
import { getSupabaseClient } from "./client";
import type { ServerErrorEnvelope } from "./types";
import { toAppError } from "./types";

interface AgentCitationRow {
  citationId: string;
  documentId: string;
  documentVersionId: string;
  chunkId: string;
  title: string;
  documentNumber: string | null;
  issuer: string[];
  validityStatus: string;
  locator: Record<string, unknown>;
  excerpt: string | null;
  score: number | null;
}

interface AgentMessageRow {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  intent: "general" | "tax_policy_case" | "enterprise_report" | "sme_finance_operations" | null;
  status: "pending" | "completed" | "insufficient_evidence" | "failed";
  errorStage: "retrieval" | "context" | "model" | "persistence" | null;
  toolsUsed: string[];
  suggestedQuestions: string[];
  citations: AgentCitationRow[];
  createdAt: string;
}

interface AgentConversationRow {
  id: string;
  enterpriseId: string;
  reportSnapshotId: string | null;
  knowledgeDocumentId: string | null;
  title: string;
  messages: AgentMessageRow[];
  createdAt: string;
  updatedAt: string;
}

interface AgentEdgeResponse {
  conversationId: string;
  messageId: string;
  status: AgentMessageRow["status"];
  intent: NonNullable<AgentMessageRow["intent"]>;
  content: string;
  citations: AgentCitationRow[];
  toolsUsed: string[];
  suggestedQuestions: string[];
  errorStage: AgentMessageRow["errorStage"];
  replayed: boolean;
}

function intent(value: AgentMessageRow["intent"]): AgentIntent | null {
  if (value === "tax_policy_case") return "tax-rag";
  if (value === "enterprise_report") return "enterprise-context";
  if (value === "sme_finance_operations") return "financial-guidance";
  return value === "general" ? "general" : null;
}

function status(value: AgentMessageRow["status"], errorStage: AgentMessageRow["errorStage"]): AgentStatus {
  if (value === "insufficient_evidence") return "insufficient-evidence";
  if (value === "failed") return errorStage === "model" ? "model-error" : "tool-error";
  return "completed";
}

function locatorLabel(locator: Record<string, unknown>): string {
  const heading = Array.isArray(locator.headingPath) ? locator.headingPath.filter((value): value is string => typeof value === "string").join(" · ") : "";
  const page = typeof locator.pageStart === "number" ? `第 ${locator.pageStart} 页` : "";
  const chars = typeof locator.charStart === "number" && typeof locator.charEnd === "number"
    ? `字符 ${locator.charStart}–${locator.charEnd}`
    : "";
  return [heading, page, chars].filter(Boolean).join(" · ") || "原文分块";
}

function citation(row: AgentCitationRow): Citation {
  return {
    documentId: row.documentId,
    sourceId: row.chunkId,
    title: row.title,
    docNo: row.documentNumber,
    locator: locatorLabel(row.locator),
    excerpt: row.excerpt,
  };
}

function message(row: AgentMessageRow): AgentMessage {
  const assistant = row.role === "assistant";
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    intent: assistant ? intent(row.intent) : null,
    status: assistant ? status(row.status, row.errorStage) : null,
    citations: (row.citations ?? []).map(citation),
    toolsUsed: row.toolsUsed ?? [],
    suggestedFollowUps: row.suggestedQuestions ?? [],
    createdAt: row.createdAt,
  };
}

function conversation(row: AgentConversationRow): AgentConversation {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    ...(row.reportSnapshotId ? { reportSnapshotId: row.reportSnapshotId } : {}),
    ...(row.knowledgeDocumentId ? { knowledgeDocumentId: row.knowledgeDocumentId } : {}),
    title: row.title,
    messages: (row.messages ?? []).map(message),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function unavailable(message = "AI 问答服务暂时不可用") {
  return failure({ code: "STORAGE_ERROR", message, retryable: true });
}

export class SupabaseAgentService implements AgentService {
  private readonly client = getSupabaseClient();
  private readonly idempotencyKeys = new Map<string, string>();

  async ask(request: AgentRequest) {
    const fingerprint = JSON.stringify({
      enterpriseId: request.enterpriseId,
      conversationId: request.conversationId ?? null,
      reportId: request.reportSnapshotId ?? null,
      knowledgeDocumentId: request.knowledgeDocumentId ?? null,
      message: request.message.trim(),
    });
    const idempotencyKey = this.idempotencyKeys.get(fingerprint) ?? crypto.randomUUID();
    this.idempotencyKeys.set(fingerprint, idempotencyKey);
    const { data, error } = await this.client.functions.invoke<AgentEdgeResponse | ServerErrorEnvelope>("agent-chat", {
      body: {
        enterpriseId: request.enterpriseId,
        conversationId: request.conversationId,
        reportId: request.reportSnapshotId,
        knowledgeDocumentId: request.knowledgeDocumentId,
        message: request.message.trim(),
        idempotencyKey,
      },
    });
    if (error || !data) return unavailable();
    if ("error" in data) {
      if (!data.error.retryable) this.idempotencyKeys.delete(fingerprint);
      return failure(toAppError(data));
    }
    this.idempotencyKeys.delete(fingerprint);
    const response: AgentResponse = {
      conversationId: data.conversationId,
      intent: intent(data.intent) ?? "general",
      status: status(data.status, data.errorStage),
      answer: data.content,
      citations: data.citations.map(citation),
      toolsUsed: data.toolsUsed,
      suggestedFollowUps: data.suggestedQuestions,
    };
    return success(response);
  }

  async getConversation(conversationId: string, enterpriseId: string) {
    const { data, error } = await this.client.rpc("get_agent_conversation", {
      p_conversation_id: conversationId,
      p_enterprise_id: enterpriseId,
    });
    if (error) return error.code === "P0002"
      ? failure({ code: "NOT_FOUND", message: "会话不存在", retryable: false })
      : unavailable("会话加载失败");
    return success(conversation(data as AgentConversationRow));
  }

  async listConversations(enterpriseId: string) {
    const { data, error } = await this.client.rpc("list_agent_conversations", { p_enterprise_id: enterpriseId });
    if (error) return error.code === "P0002"
      ? failure({ code: "NOT_FOUND", message: "企业不存在", retryable: false })
      : unavailable("会话列表加载失败");
    return success(((data ?? []) as AgentConversationRow[]).map(conversation));
  }

  async deleteConversation(conversationId: string, enterpriseId: string) {
    const { error } = await this.client.from("agent_conversations").delete()
      .eq("id", conversationId).eq("enterprise_id", enterpriseId);
    return error ? unavailable("会话删除失败") : success(undefined);
  }
}
