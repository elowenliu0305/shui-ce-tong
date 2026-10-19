import { describe, expect, it } from "vitest";

import { MockAgentService } from "../../src/services/mock/mock-agent-service";
import { createMockDatabase } from "../../src/services/mock/mock-database";
import { MockEnterpriseService } from "../../src/services/mock/mock-enterprise-service";
import { MockFileAnalysisService } from "../../src/services/mock/mock-file-analysis-service";
import { MockKnowledgeService } from "../../src/services/mock/mock-knowledge-service";
import { createMemoryStorage } from "../test-storage";

describe("enterprise scoped assets", () => {
  it("isolates reports, conversations and files while sharing account favorites", async () => {
    const database = createMockDatabase(createMemoryStorage());
    const enterprises = new MockEnterpriseService(database);
    const created = await enterprises.create("account-demo", { name: "第二企业", regionProvince: "上海市", regionCity: "上海市", industry: "制造业" });
    if (!created.ok) throw new Error(created.error.message);
    const secondId = created.data.id;
    const agent = new MockAgentService(database);
    const files = new MockFileAnalysisService(database);
    const knowledge = new MockKnowledgeService(database);
    await agent.ask({ enterpriseId: "enterprise-nebula", message: "怎么改善现金流？" });
    await agent.ask({ enterpriseId: secondId, message: "怎么控制成本？" });
    await files.register("enterprise-nebula", { displayName: "一号.pdf", mediaType: "application/pdf", byteSize: 10 }, "tax-health");
    await files.register(secondId, { displayName: "二号.pdf", mediaType: "application/pdf", byteSize: 20 }, "invoice-check");
    await knowledge.setFavorite("account-demo", "doc-rd-deduction", true);

    const firstConversations = await agent.listConversations("enterprise-nebula");
    const secondConversations = await agent.listConversations(secondId);
    const firstFiles = await files.list("enterprise-nebula");
    const secondFiles = await files.list(secondId);
    expect(firstConversations.ok && firstConversations.data).toHaveLength(1);
    expect(secondConversations.ok && secondConversations.data).toHaveLength(1);
    expect(firstFiles.ok && firstFiles.data[0].displayName).toBe("一号.pdf");
    expect(secondFiles.ok && secondFiles.data[0].displayName).toBe("二号.pdf");

    await enterprises.delete("account-demo", "enterprise-nebula");
    const favorites = await knowledge.list("account-demo", { favoritesOnly: true, enterpriseId: secondId });
    expect(favorites.ok && favorites.data.total).toBe(1);
    expect((await agent.listConversations(secondId)).ok).toBe(true);
  });
});
