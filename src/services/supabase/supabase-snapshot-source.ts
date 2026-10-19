import type { AuthService } from "../contracts/auth-service";
import type { AppSnapshotSource } from "../contracts/app-snapshot-source";
import { createEmptyEnvelope, deepFreeze, type MockEnvelope } from "../mock/mock-database";
import type { SupabaseEnterpriseService } from "./supabase-enterprise-service";
import { getSupabaseClient } from "./client";

export class SupabaseSnapshotSource implements AppSnapshotSource {
  readonly readyInitially = false;
  private snapshot = createEmptyEnvelope();
  private readonly client = getSupabaseClient();

  constructor(
    private readonly auth: AuthService,
    private readonly enterprises: SupabaseEnterpriseService,
  ) {}

  initial() {
    return deepFreeze(structuredClone(this.snapshot));
  }

  async read(): Promise<Readonly<MockEnvelope>> {
    const sessionResult = await this.auth.getSession();
    if (!sessionResult.ok || !sessionResult.data) {
      this.snapshot = { ...createEmptyEnvelope(), revision: this.snapshot.revision + 1, updatedAt: new Date().toISOString() };
      return deepFreeze(structuredClone(this.snapshot));
    }

    const session = sessionResult.data;
    const [enterpriseResult, currentEnterpriseId, profiles, questionnaires, reports, favorites] = await Promise.all([
      this.enterprises.list(session.accountId),
      this.enterprises.getCurrentEnterpriseId(),
      this.client.from("company_profile_drafts").select("*"),
      this.client.from("questionnaire_drafts").select("*"),
      this.client.from("report_snapshots").select("id, enterprise_id, report"),
      this.client.from("favorites").select("owner_id, document_id, created_at"),
    ]);
    if (!enterpriseResult.ok) throw new Error(enterpriseResult.error.message);
    if (profiles.error || questionnaires.error || reports.error || favorites.error) throw new Error("企业体检数据加载失败，请稍后重试");

    this.snapshot = {
      ...createEmptyEnvelope(),
      revision: this.snapshot.revision + 1,
      updatedAt: new Date().toISOString(),
      session,
      activeEnterpriseId: currentEnterpriseId,
      enterprisesById: Object.fromEntries(enterpriseResult.data.map((enterprise) => [enterprise.id, enterprise])),
      profileDraftsByEnterpriseId: Object.fromEntries((profiles.data ?? []).map((row) => [row.enterprise_id, {
        id: row.id,
        enterpriseId: row.enterprise_id,
        schemaVersion: 2 as const,
        fields: row.answers,
        completionPercent: row.completion_percent,
        updatedAt: row.updated_at,
      }])),
      riskDraftsByEnterpriseId: Object.fromEntries((questionnaires.data ?? []).map((row) => [row.enterprise_id, {
        id: row.id,
        enterpriseId: row.enterprise_id,
        answersByQuestionId: row.answers,
        updatedAt: row.updated_at,
      }])),
      reportSnapshotsById: Object.fromEntries((reports.data ?? []).map((row) => [row.id, row.report])),
      favoritesById: Object.fromEntries((favorites.data ?? []).map((row) => {
        const id = `${row.owner_id}:${row.document_id}`;
        return [id, {
          id,
          accountId: row.owner_id,
          targetType: "other" as const,
          targetId: row.document_id,
          createdAt: row.created_at,
        }];
      })),
    };
    return deepFreeze(structuredClone(this.snapshot));
  }
}
