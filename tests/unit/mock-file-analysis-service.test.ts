import { describe, expect, it } from "vitest";

import { createMockDatabase } from "../../src/services/mock/mock-database";
import { MockFileAnalysisService } from "../../src/services/mock/mock-file-analysis-service";
import { createMemoryStorage } from "../test-storage";

describe("MockFileAnalysisService", () => {
  it("stores display metadata and always keeps contentRead false", async () => {
    const storage = createMemoryStorage();
    const service = new MockFileAnalysisService(createMockDatabase(storage));
    const created = await service.register("enterprise-nebula", { displayName: "研发辅助账.xlsx", mediaType: "application/vnd.ms-excel", byteSize: 12345 }, "rd-check");
    if (!created.ok) throw new Error(created.error.message);
    await service.refreshStatus(created.data.id, "enterprise-nebula");
    const completed = await service.refreshStatus(created.data.id, "enterprise-nebula");
    expect(completed.ok && completed.data.contentRead).toBe(false);
    const serialized = storage.dump();
    expect(serialized).not.toMatch(/base64|blob:|objectURL|fileContent/i);
    expect(serialized).toContain("研发辅助账.xlsx");
  });
});
