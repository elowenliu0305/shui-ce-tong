import type { AssessmentResult, RiskQuestionnaireDraft } from "../../domain/assessment";
import type { CompanyProfileDraft } from "../../domain/enterprise";
import type { ReportSnapshot } from "../../domain/report";
import type { ServiceResult } from "./service-result";

export interface AssessmentService {
  getProfileDraft(enterpriseId: string): Promise<ServiceResult<CompanyProfileDraft>>;
  saveProfileDraft(draft: CompanyProfileDraft): Promise<ServiceResult<CompanyProfileDraft>>;
  getRiskDraft(enterpriseId: string): Promise<ServiceResult<RiskQuestionnaireDraft>>;
  saveRiskDraft(draft: RiskQuestionnaireDraft): Promise<ServiceResult<RiskQuestionnaireDraft>>;
  preview(enterpriseId: string): Promise<ServiceResult<AssessmentResult>>;
  complete(enterpriseId: string): Promise<ServiceResult<ReportSnapshot>>;
  getReport(reportId: string): Promise<ServiceResult<ReportSnapshot>>;
  listReports(enterpriseId: string): Promise<ServiceResult<ReportSnapshot[]>>;
}
