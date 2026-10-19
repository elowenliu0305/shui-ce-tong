export type ISODate = string;
export type ISODateTime = string;
export type FieldSource = "user" | "ocr-demo" | "seed";

export type FieldValue<T> =
  | { status: "known"; value: T; source: FieldSource; updatedAt: ISODateTime }
  | { status: "unknown" | "unset"; source: FieldSource; updatedAt: ISODateTime };

export interface MoneyValue {
  amountYuan: number;
  currency: "CNY";
  dataYear: number;
}

export interface Citation {
  documentId: string;
  sourceId: string;
  title: string;
  docNo: string | null;
  locator: string;
  excerpt: string | null;
}

export interface CompanyProfileFields {
  companyName: FieldValue<string>;
  region: FieldValue<{ province: string; city: string }>;
  industry: FieldValue<string>;
  unifiedSocialCreditCode: FieldValue<string>;
  establishedDate: FieldValue<ISODate>;
  taxpayerType: FieldValue<string>;
  dataYear: FieldValue<number>;
  annualRevenue: FieldValue<MoneyValue>;
  totalAssets: FieldValue<MoneyValue>;
  employeeCount: FieldValue<number>;
  taxableIncome: FieldValue<MoneyValue>;
  researchInvestment: FieldValue<MoneyValue>;
  enjoyedTaxIncentives: FieldValue<string[]>;
}

export interface CompanyProfileDraft {
  id: string;
  enterpriseId: string;
  schemaVersion: 2;
  fields: CompanyProfileFields;
  completionPercent: number;
  updatedAt: ISODateTime;
}

export interface Enterprise {
  id: string;
  accountId: string;
  name: string;
  regionProvince: string;
  regionCity: string;
  industry: string;
  revision: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

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

export interface RiskSummary {
  confirmedRiskCount: number;
  pendingVerificationCount: number;
  level: "low" | "medium" | "high";
  healthPercent: number;
  items: Array<{ questionId: string; questionTitle: string; optionId: string; answerLabel: string; riskPoints: 1 }>;
  pendingItems: Array<{ questionId: string; questionTitle: string; optionId: string; answerLabel: string }>;
}

export type ConditionOperator = "eq" | "neq" | "in" | "notIn" | "gte" | "lte" | "between" | "includesAny" | "includesAll" | "isKnown" | "isUnknown";

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

export interface ReportSnapshot {
  id: string;
  assessmentRunId: string;
  enterpriseId: string;
  enterpriseDisplay: { name: string; region: string; industry: string };
  profileSnapshot: CompanyProfileDraft;
  riskAnswersSnapshot: RiskQuestionnaireDraft;
  result: AssessmentResult;
  createdAt: ISODateTime;
  versions: { engine: string; ruleSet: string; catalog: string };
}
