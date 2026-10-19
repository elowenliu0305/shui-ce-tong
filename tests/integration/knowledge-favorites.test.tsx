import { describe, expect, it } from "vitest";

import type { ReportSnapshot } from "../../src/domain/report";
import { createMockDatabase } from "../../src/services/mock/mock-database";
import { MockKnowledgeService } from "../../src/services/mock/mock-knowledge-service";
import { createMemoryStorage } from "../test-storage";

describe("knowledge favorites", () => {
  it("keeps favorites at account scope and recalculates applicability by enterprise", async () => {
    const database = createMockDatabase(createMemoryStorage());
    database.transact((draft) => {
      draft.enterprisesById["enterprise-two"] = { ...draft.enterprisesById["enterprise-nebula"], id: "enterprise-two", name: "第二家企业" };
      const report = (id: string, enterpriseId: string, status: "eligible" | "pending") => ({
        id, enterpriseId, createdAt: "2026-10-15T00:00:00.000Z",
        result: { policyMatches: [{ policyVersionId: "doc-rd-deduction@demo-2026.1", status }] }
      }) as ReportSnapshot;
      draft.reportSnapshotsById.one = report("one", "enterprise-nebula", "eligible");
      draft.reportSnapshotsById.two = report("two", "enterprise-two", "pending");
    });
    const service = new MockKnowledgeService(database);
    await service.setFavorite("account-demo", "doc-rd-deduction", true);
    const first = await service.get("account-demo", "doc-rd-deduction", "enterprise-nebula");
    const second = await service.get("account-demo", "doc-rd-deduction", "enterprise-two");
    expect(first.ok && first.data.favorite && first.data.applicability).toBe("eligible");
    expect(second.ok && second.data.favorite && second.data.applicability).toBe("pending");
    expect(Object.keys(database.read().favoritesById)).toHaveLength(1);
  });
});
