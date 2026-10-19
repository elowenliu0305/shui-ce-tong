import type { Enterprise, EnterpriseDeletionSummary, EnterpriseInput } from "../../domain/enterprise";
import type { ServiceResult } from "./service-result";

export interface EnterpriseService {
  list(accountId: string): Promise<ServiceResult<Enterprise[]>>;
  get(enterpriseId: string): Promise<ServiceResult<Enterprise>>;
  create(accountId: string, input: EnterpriseInput): Promise<ServiceResult<Enterprise>>;
  update(enterpriseId: string, input: EnterpriseInput): Promise<ServiceResult<Enterprise>>;
  switchActive(accountId: string, enterpriseId: string): Promise<ServiceResult<Enterprise>>;
  delete(accountId: string, enterpriseId: string): Promise<ServiceResult<EnterpriseDeletionSummary>>;
}
