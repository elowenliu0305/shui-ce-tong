import type { Citation, ISODate, ISODateTime } from "./shared";
import type { CompanyProfileDraft } from "./enterprise";

export type RiskEffect = "safe" | "risk" | "unknown";

export interface RiskOption {
  id: string;
  label: string;
  effect: RiskEffect;
  riskPoints: 0 | 1;
}

export interface RiskQuestion {
  id: string;
  order: number;
  title: string;
  help: string;
  options: RiskOption[];
}

export interface RiskQuestionnaireDraft {
  id: string;
  enterpriseId: string;
  answersByQuestionId: Record<string, string>;
  updatedAt: ISODateTime;
}

export interface RiskItem {
  questionId: string;
  questionTitle: string;
  optionId: string;
  answerLabel: string;
  riskPoints: 1;
}

export interface PendingVerification {
  questionId: string;
  questionTitle: string;
  optionId: string;
  answerLabel: string;
}

export interface RiskSummary {
  confirmedRiskCount: number;
  pendingVerificationCount: number;
  level: "low" | "medium" | "high";
  healthPercent: number;
  items: RiskItem[];
  pendingItems: PendingVerification[];
}

export type ConditionOperator =
  | "eq"
  | "neq"
  | "in"
  | "notIn"
  | "gte"
  | "lte"
  | "between"
  | "includesAny"
  | "includesAll"
  | "isKnown"
  | "isUnknown";

export interface Condition {
  id: string;
  fieldPath: string;
  operator: ConditionOperator;
  expected: unknown;
  basisRefs: string[];
  required?: boolean;
  exclusion?: boolean;
}

export interface ConditionEvaluation extends Condition {
  outcome: "pass" | "fail" | "unknown";
  actual: unknown;
}

export interface PolicyMatch {
  policyVersionId: string;
  status: "eligible" | "pending" | "ineligible";
  satisfied: ConditionEvaluation[];
  missing: ConditionEvaluation[];
  failed: ConditionEvaluation[];
  ruleId: string;
  ruleVersion: string;
  evaluatedAt: ISODateTime;
}

export interface PolicyRuleDefinition {
  id: string;
  version: string;
  policyVersionId: string;
  title: string;
  conditions: Condition[];
  formulaId: string | null;
  formulaVersion: string | null;
  formulaInputPaths: string[];
  overlapGroup: string | null;
  overlapPriority: number;
  citation: Citation;
}

export interface SavingsEstimate {
  policyVersionId: string;
  status: "computed" | "pending" | "excluded";
  formulaId: string | null;
  formulaVersion: string | null;
  inputValues: Record<string, unknown>;
  amountYuan: number | null;
  missingFieldPaths: string[];
  overlapGroup: string | null;
}

export interface AssessmentResult {
  profileCompleteness: number;
  riskSummary: RiskSummary;
  policyMatches: PolicyMatch[];
  savingsEstimates: SavingsEstimate[];
  estimatedTotalSavingYuan: number | null;
  priorityActions: string[];
  citations: Citation[];
}

export interface AssessmentRun {
  id: string;
  enterpriseId: string;
  status: "completed" | "failed";
  asOfDate: ISODate;
  createdAt: ISODateTime;
  completedAt: ISODateTime;
  engineVersion: string;
  ruleSetVersion: string;
  catalogVersion: string;
  profileSnapshot: CompanyProfileDraft;
  riskAnswersSnapshot: RiskQuestionnaireDraft;
  result: AssessmentResult;
}
