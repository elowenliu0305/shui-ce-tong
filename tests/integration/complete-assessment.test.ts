import { describe, expect, it } from "vitest";

import { createTestAdminClient, createTestUserClient, integrationTestsConfigured } from "./helpers/supabase";

const configured = integrationTestsConfigured() && Boolean(process.env.SUPABASE_TEST_SERVICE_ROLE_KEY);

describe.skipIf(!configured)("complete-assessment Edge Function", () => {
  it("replays one idempotent completion and keeps the stored report immutable", async () => {
    const admin = createTestAdminClient();
    const email = `assessment-${crypto.randomUUID()}@example.com`;
    const password = `Test-${crypto.randomUUID()}-9a!`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull();
    const userId = created.data.user?.id;
    expect(userId).toBeTruthy();
    if (!userId) return;

    const enterpriseId = crypto.randomUUID();
    try {
      const enterprise = await admin.from("enterprises").insert({
        id: enterpriseId,
        owner_id: userId,
        name: "评测集成测试企业",
        region_province: "浙江省",
        region_city: "杭州市",
        industry: "软件业",
      });
      expect(enterprise.error).toBeNull();

      const userClient = createTestUserClient();
      const signedIn = await userClient.auth.signInWithPassword({ email, password });
      expect(signedIn.error).toBeNull();

      const profileMutation = await userClient.rpc("save_company_profile_draft", {
        p_enterprise_id: enterpriseId,
        p_expected_revision: 0,
        p_answers: {},
        p_completion_percent: 0,
        p_mutation_id: crypto.randomUUID(),
      });
      expect(profileMutation.error).toBeNull();

      const questionRelease = await userClient.from("question_set_releases")
        .select("id, questions")
        .eq("status", "active")
        .single();
      expect(questionRelease.error).toBeNull();
      const questions = questionRelease.data?.questions as Array<{ id: string; options: Array<{ id: string }> }>;
      const answers = Object.fromEntries(questions.map((question) => [question.id, question.options[0].id]));
      const questionnaireMutation = await userClient.rpc("save_questionnaire_draft", {
        p_enterprise_id: enterpriseId,
        p_expected_revision: 0,
        p_question_set_release_id: questionRelease.data?.id,
        p_answers: answers,
        p_mutation_id: crypto.randomUUID(),
      });
      expect(questionnaireMutation.error).toBeNull();

      const idempotencyKey = crypto.randomUUID();
      const request = {
        enterpriseId,
        profileRevision: 1,
        questionnaireRevision: 1,
        asOfDate: "2026-10-19",
        idempotencyKey,
      };
      const first = await userClient.functions.invoke<{ reportId: string; replayed: boolean }>("complete-assessment", { body: request });
      const replay = await userClient.functions.invoke<{ reportId: string; replayed: boolean }>("complete-assessment", { body: request });
      expect(first.error).toBeNull();
      expect(replay.error).toBeNull();
      expect(replay.data?.reportId).toBe(first.data?.reportId);
      expect(replay.data?.replayed).toBe(true);

      const reports = await admin.from("report_snapshots")
        .select("id, content_hash, report")
        .eq("enterprise_id", enterpriseId);
      expect(reports.error).toBeNull();
      expect(reports.data).toHaveLength(1);
      expect(reports.data?.[0].report).toMatchObject({ enterpriseId, result: { riskSummary: { level: "low" } } });
    } finally {
      await admin.from("enterprises").delete().eq("id", enterpriseId);
      await admin.auth.admin.deleteUser(userId);
    }
  });
});
