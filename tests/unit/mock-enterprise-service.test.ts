import { describe, expect, it } from "vitest";

import type { ReportSnapshot } from "../../src/domain/report";
import { MockEnterpriseService } from "../../src/services/mock/mock-enterprise-service";
import { createMockDatabase } from "../../src/services/mock/mock-database";
import { createMemoryStorage } from "../test-storage";

const validInput = {
  name: "杭州测试科技有限公司",
  regionProvince: "浙江省",
  regionCity: "杭州市",
  industry: "软件和信息技术服务业"
};

describe("MockEnterpriseService", () => {
  it("validates required fields and switches the active enterprise explicitly", async () => {
    const database = createMockDatabase(createMemoryStorage());
    const service = new MockEnterpriseService(database);
    const invalid = await service.create("account-demo", { ...validInput, name: "" });
    expect(invalid.ok).toBe(false);

    const created = await service.create("account-demo", validInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(database.read().activeEnterpriseId).toBe(created.data.id);
    expect((await service.switchActive("account-demo", "enterprise-nebula")).ok).toBe(true);
    expect(database.read().activeEnterpriseId).toBe("enterprise-nebula");
  });

  it("cascades enterprise assets while preserving account favorites", async () => {
    const database = createMockDatabase(createMemoryStorage());
    const service = new MockEnterpriseService(database);
    database.transact((draft) => {
      draft.profileDraftsByEnterpriseId["enterprise-nebula"] = { enterpriseId: "enterprise-nebula" } as never;
      draft.reportSnapshotsById["report-1"] = { id: "report-1", enterpriseId: "enterprise-nebula" } as ReportSnapshot;
      draft.favoritesById["favorite-1"] = {
        id: "favorite-1",
        accountId: "account-demo",
        targetType: "policy",
        targetId: "doc-rd-deduction",
        createdAt: "2026-10-15T00:00:00.000Z"
      };
    });

    const deleted = await service.delete("account-demo", "enterprise-nebula");
    expect(deleted.ok && deleted.data.deletedReports).toBe(1);
    expect(database.read().reportSnapshotsById).toEqual({});
    expect(database.read().profileDraftsByEnterpriseId).toEqual({});
    expect(Object.keys(database.read().favoritesById)).toEqual(["favorite-1"]);
  });
});
