interface EnterpriseContextInput {
  enterprise: { id: string; region_province: string; region_city: string; industry: string };
  profileAnswers?: Record<string, unknown> | null;
  report?: Record<string, unknown> | null;
  reportId?: string | null;
}

const allowedProfileFields = [
  "establishedDate",
  "taxpayerType",
  "dataYear",
  "annualRevenue",
  "totalAssets",
  "employeeCount",
  "taxableIncome",
  "researchInvestment",
  "enjoyedTaxIncentives",
] as const;

function pickObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function projectSafeEnterpriseContext(input: EnterpriseContextInput) {
  const profile = input.profileAnswers ?? {};
  const safeProfile = Object.fromEntries(allowedProfileFields.flatMap((key) => key in profile ? [[key, profile[key]]] : []));
  const report = pickObject(input.report);
  const result = pickObject(report?.result);
  return {
    enterpriseId: input.enterprise.id,
    region: { province: input.enterprise.region_province, city: input.enterprise.region_city },
    industry: input.enterprise.industry,
    profile: safeProfile,
    report: report ? {
      reportId: input.reportId ?? null,
      createdAt: report.createdAt ?? null,
      riskSummary: result?.riskSummary ?? null,
      priorityActions: result?.priorityActions ?? [],
      savingsEstimates: result?.savingsEstimates ?? [],
      versions: report.versions ?? null,
    } : null,
  };
}

interface QueryResult<T> { data: T | null; error: { message: string } | null }
interface QueryBuilder<T> extends PromiseLike<QueryResult<T>> {
  select(columns: string): QueryBuilder<T>;
  eq(column: string, value: string): QueryBuilder<T>;
  order(column: string, options: { ascending: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  maybeSingle(): QueryBuilder<T>;
}
interface ContextClient { from<T = unknown>(table: string): QueryBuilder<T> }

export async function buildEnterpriseContext(
  client: ContextClient,
  ownerId: string,
  enterpriseId: string,
  reportId?: string | null,
) {
  const enterpriseQuery = client.from<{ id: string; region_province: string; region_city: string; industry: string }>("enterprises")
    .select("id, region_province, region_city, industry")
    .eq("id", enterpriseId).eq("owner_id", ownerId).eq("deletion_state", "active").maybeSingle();
  const profileQuery = client.from<{ answers: Record<string, unknown> }>("company_profile_drafts")
    .select("answers").eq("enterprise_id", enterpriseId).eq("owner_id", ownerId).maybeSingle();
  const reportQuery = reportId
    ? client.from<{ id: string; report: Record<string, unknown> }>("report_snapshots").select("id, report")
      .eq("id", reportId).eq("enterprise_id", enterpriseId).eq("owner_id", ownerId).maybeSingle()
    : client.from<{ id: string; report: Record<string, unknown> }>("report_snapshots").select("id, report")
      .eq("enterprise_id", enterpriseId).eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const [enterprise, profile, report] = await Promise.all([enterpriseQuery, profileQuery, reportQuery]);
  if (enterprise.error || !enterprise.data) throw new Error("context_enterprise_not_found");
  if (profile.error || report.error) throw new Error("context_dependency_unavailable");
  if (reportId && !report.data) throw new Error("context_report_not_found");
  return projectSafeEnterpriseContext({
    enterprise: enterprise.data,
    profileAnswers: profile.data?.answers,
    report: report.data?.report,
    reportId: report.data?.id,
  });
}
