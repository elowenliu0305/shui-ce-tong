import type { FieldValue, ISODate, ISODateTime, MoneyValue } from "./shared";

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

export type CompanyProfileFieldName = keyof CompanyProfileFields;

export interface CompanyProfileDraft {
  id: string;
  enterpriseId: string;
  schemaVersion: 2;
  fields: CompanyProfileFields;
  completionPercent: number;
  updatedAt: ISODateTime;
}

export interface EnterpriseInput {
  name: string;
  regionProvince: string;
  regionCity: string;
  industry: string;
}

export interface EnterpriseDeletionSummary {
  enterpriseId: string;
  deletedProfileDrafts: number;
  deletedRiskDrafts: number;
  deletedReports: number;
  deletedConversations: number;
  deletedFileRecords: number;
  preservedFavorites: number;
  activeEnterpriseId: string | null;
}
