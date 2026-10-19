import type { AgentConversation, AgentIntent, AgentMessage, AgentRequest, AgentResponse, AgentStatus } from "../../domain/agent";
import type { Citation } from "../../domain/shared";
import { knowledgeDocuments } from "../../fixtures/knowledge";
import { policyRules } from "../../fixtures/policies";
import type { AgentService } from "../contracts/agent-service";
import { failure, success } from "../contracts/service-result";
import type { MockDatabase } from "./mock-database";

const makeId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
const taxPattern = /税|发票|政策|申报|加计扣除|所得税|增值税/;
const financePattern = /现金流|融资|贷款|成本|预算|应收账款|经营分析/;

function citationFor(documentId: string): Citation | null {
  return policyRules.find((rule) => rule.citation.documentId === documentId)?.citation ?? null;
}

function answerRequest(request: AgentRequest, database: MockDatabase): Omit<AgentResponse, "conversationId"> {
  const message = request.message.trim();
  if (message.includes("模拟工具错误")) return { intent: "tax-rag", status: "tool-error", answer: "资料检索工具暂时不可用，未生成税务结论。请稍后重试。", citations: [], toolsUsed: ["knowledge-search:error"], suggestedFollowUps: ["稍后重新检索"] };
  if (message.includes("模拟模型错误")) return { intent: "general", status: "model-error", answer: "回答服务暂时不可用，请稍后重试。", citations: [], toolsUsed: [], suggestedFollowUps: ["重新发送问题"] };

  const requestedDocument = request.knowledgeDocumentId ? knowledgeDocuments.find((item) => item.id === request.knowledgeDocumentId) : null;
  if (taxPattern.test(message) || requestedDocument?.kind === "policy") {
    const documentId = request.knowledgeDocumentId ?? (message.includes("研发") ? "doc-rd-deduction" : message.includes("小微") ? "doc-small-profit" : "");
    const citation = documentId ? citationFor(documentId) : null;
    if (!citation) return { intent: "tax-rag", status: "insufficient-evidence", answer: "当前资料库没有检索到足够可靠的依据，因此我不能直接给出确定的税务结论。你可以补充政策名称、文号、地区或具体业务背景。", citations: [], toolsUsed: ["knowledge-search"], suggestedFollowUps: ["补充政策文号", "说明企业所在地区", "描述具体业务场景"] };
    return { intent: "tax-rag", status: "completed", answer: `根据已检索资料，只能确认应结合适用条件、归集口径和留存备查要求进一步判断。当前回答是演示说明，不替代正式税务意见。`, citations: [citation], toolsUsed: ["knowledge-search", "citation-check"], suggestedFollowUps: ["我的企业还缺哪些资料？", "这项政策如何留存备查？"] };
  }

  if (request.reportSnapshotId || /我的企业|体检报告|风险/.test(message)) {
    const report = request.reportSnapshotId ? database.read().reportSnapshotsById[request.reportSnapshotId] : Object.values(database.read().reportSnapshotsById).filter((item) => item.enterpriseId === request.enterpriseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!report || report.enterpriseId !== request.enterpriseId) return { intent: "enterprise-context", status: "insufficient-evidence", answer: "当前企业没有可用的报告上下文，我不能推断具体风险。请先完成体检或选择一份报告。", citations: [], toolsUsed: ["report-context"], suggestedFollowUps: ["开始税务体检"] };
    return { intent: "enterprise-context", status: "completed", answer: `这份报告包含 ${report.result.riskSummary.confirmedRiskCount} 个风险答案、${report.result.riskSummary.pendingVerificationCount} 个待核验答案。建议先补齐待核验资料，再按报告行动项逐项处理。`, citations: report.result.citations, toolsUsed: ["report-context"], suggestedFollowUps: ["先处理哪个风险？", "有哪些待补资料？"] };
  }

  if (financePattern.test(message)) return { intent: "financial-guidance", status: "completed", answer: "可以先把未来 13 周的现金流按经营、投资和融资三类拆开，重点跟踪回款周期、固定支出和最低现金余额。若你愿意，我可以继续帮你做小微企业现金流清单。", citations: [], toolsUsed: [], suggestedFollowUps: ["生成 13 周现金流清单", "如何缩短应收账款周期？"] };
  return { intent: "general", status: "completed", answer: "我可以协助梳理这个问题。如果它涉及你的企业经营，我还可以从小微企业的现金流、融资、成本和税务资料准备角度继续追问。", citations: [], toolsUsed: [], suggestedFollowUps: ["从现金流角度分析", "我需要准备哪些企业资料？"] };
}

function message(conversationId: string, role: AgentMessage["role"], content: string, intent: AgentIntent | null, status: AgentStatus | null, citations: Citation[] = [], toolsUsed: string[] = [], suggestedFollowUps: string[] = []): AgentMessage {
  return { id: makeId("message"), conversationId, role, content: content.replace(/<[^>]+>/g, ""), intent, status, citations, toolsUsed, suggestedFollowUps, createdAt: new Date().toISOString() };
}

export class MockAgentService implements AgentService {
  constructor(private readonly database: MockDatabase) {}

  async ask(request: AgentRequest) {
    if (!request.message.trim()) return failure({ code: "VALIDATION_ERROR", message: "请输入问题", retryable: false });
    const existing = request.conversationId ? this.database.read().agentConversationsById[request.conversationId] : null;
    if (existing && existing.enterpriseId !== request.enterpriseId) return failure({ code: "NOT_FOUND", message: "会话不属于当前企业", retryable: false });
    const conversationId = existing?.id ?? makeId("conversation");
    const response = answerRequest(request, this.database);
    const now = new Date().toISOString();
    this.database.transact((draft) => {
      const conversation: AgentConversation = draft.agentConversationsById[conversationId] ?? { id: conversationId, enterpriseId: request.enterpriseId, reportSnapshotId: request.reportSnapshotId, knowledgeDocumentId: request.knowledgeDocumentId, title: request.message.slice(0, 28), messages: [], createdAt: now, updatedAt: now };
      conversation.messages.push(message(conversationId, "user", request.message, null, null));
      conversation.messages.push(message(conversationId, "assistant", response.answer, response.intent, response.status, response.citations, response.toolsUsed, response.suggestedFollowUps));
      conversation.updatedAt = now;
      draft.agentConversationsById[conversationId] = conversation;
    });
    return success({ conversationId, ...response });
  }

  async getConversation(conversationId: string, enterpriseId: string) {
    const conversation = this.database.read().agentConversationsById[conversationId];
    return conversation?.enterpriseId === enterpriseId ? success(conversation) : failure({ code: "NOT_FOUND", message: "会话不存在", retryable: false });
  }

  async listConversations(enterpriseId: string) {
    return success(Object.values(this.database.read().agentConversationsById).filter((item) => item.enterpriseId === enterpriseId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  async deleteConversation(conversationId: string, enterpriseId: string) {
    const conversation = this.database.read().agentConversationsById[conversationId];
    if (!conversation || conversation.enterpriseId !== enterpriseId) return failure({ code: "NOT_FOUND", message: "会话不存在", retryable: false });
    this.database.transact((draft) => { delete draft.agentConversationsById[conversationId]; });
    return success(undefined);
  }
}
