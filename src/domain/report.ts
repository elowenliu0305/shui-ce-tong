import type { AssessmentResult, RiskQuestionnaireDraft } from "./assessment";
import type { CompanyProfileDraft } from "./enterprise";
import type { ISODateTime } from "./shared";

export interface ReportSnapshot {
  id: string;
  assessmentRunId: string;
  enterpriseId: string;
  enterpriseDisplay: {
    name: string;
    region: string;
    industry: string;
  };
  profileSnapshot: CompanyProfileDraft;
  riskAnswersSnapshot: RiskQuestionnaireDraft;
  result: AssessmentResult;
  createdAt: ISODateTime;
  versions: {
    engine: string;
    ruleSet: string;
    catalog: string;
  };
}
