export type { AuthService } from "./auth-service";
export type { EnterpriseService } from "./enterprise-service";
export type { AssessmentService } from "./assessment-service";
export type { KnowledgeService } from "./knowledge-service";
export type { AgentService } from "./agent-service";
export type { FileAnalysisService } from "./file-analysis-service";
export type { AppSnapshotSource } from "./app-snapshot-source";

import type { AuthService } from "./auth-service";
import type { EnterpriseService } from "./enterprise-service";
import type { AssessmentService } from "./assessment-service";
import type { KnowledgeService } from "./knowledge-service";
import type { AgentService } from "./agent-service";
import type { FileAnalysisService } from "./file-analysis-service";

export interface ServiceRegistry {
  auth: AuthService;
  enterprises: EnterpriseService;
  assessment: AssessmentService;
  knowledge: KnowledgeService;
  agent: AgentService;
  files: FileAnalysisService;
}
