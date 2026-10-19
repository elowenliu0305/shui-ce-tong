import type { Citation, ISODateTime } from "./shared";

export type AgentIntent = "general" | "tax-rag" | "enterprise-context" | "financial-guidance";
export type AgentStatus = "completed" | "insufficient-evidence" | "tool-error" | "model-error";

export interface AgentRequest {
  conversationId?: string;
  enterpriseId: string;
  reportSnapshotId?: string;
  knowledgeDocumentId?: string;
  message: string;
}

export interface AgentResponse {
  conversationId: string;
  intent: AgentIntent;
  status: AgentStatus;
  answer: string;
  citations: Citation[];
  toolsUsed: string[];
  suggestedFollowUps: string[];
}

export interface AgentMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  intent: AgentIntent | null;
  status: AgentStatus | null;
  citations: Citation[];
  toolsUsed: string[];
  suggestedFollowUps: string[];
  createdAt: ISODateTime;
}

export interface AgentConversation {
  id: string;
  enterpriseId: string;
  reportSnapshotId?: string;
  knowledgeDocumentId?: string;
  title: string;
  messages: AgentMessage[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
