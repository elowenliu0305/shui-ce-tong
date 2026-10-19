import type { AgentConversation, AgentRequest, AgentResponse } from "../../domain/agent";
import type { ServiceResult } from "./service-result";

export interface AgentService {
  ask(request: AgentRequest): Promise<ServiceResult<AgentResponse>>;
  getConversation(conversationId: string, enterpriseId: string): Promise<ServiceResult<AgentConversation>>;
  listConversations(enterpriseId: string): Promise<ServiceResult<AgentConversation[]>>;
  deleteConversation(conversationId: string, enterpriseId: string): Promise<ServiceResult<void>>;
}
