import { describe, expect, it } from "vitest";

import { MockAgentService } from "../../src/services/mock/mock-agent-service";
import { createMockDatabase } from "../../src/services/mock/mock-database";
import { createMemoryStorage } from "../test-storage";

describe("agent enterprise context", () => {
  it("isolates conversations by enterprise and rejects cross-enterprise continuation", async () => {
    const database = createMockDatabase(createMemoryStorage());
    database.transact((draft) => { draft.enterprisesById.two = { ...draft.enterprisesById["enterprise-nebula"], id: "two", name: "第二企业" }; });
    const service = new MockAgentService(database);
    const first = await service.ask({ enterpriseId: "enterprise-nebula", message: "怎么改善现金流？" });
    if (!first.ok) throw new Error(first.error.message);
    const crossed = await service.ask({ enterpriseId: "two", conversationId: first.data.conversationId, message: "继续" });
    const second = await service.ask({ enterpriseId: "two", message: "怎么控制成本？" });
    expect(crossed.ok).toBe(false);
    expect(second.ok).toBe(true);
    const firstList = await service.listConversations("enterprise-nebula");
    const secondList = await service.listConversations("two");
    expect(firstList.ok && firstList.data).toHaveLength(1);
    expect(secondList.ok && secondList.data).toHaveLength(1);
    expect(Object.values(database.read().agentConversationsById).map((item) => item.enterpriseId).sort()).toEqual(["enterprise-nebula", "two"]);
  });
});
