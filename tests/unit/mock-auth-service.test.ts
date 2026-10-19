import { describe, expect, it } from "vitest";

import { MockAuthService } from "../../src/services/mock/mock-auth-service";
import { createMockDatabase } from "../../src/services/mock/mock-database";
import { createMemoryStorage } from "../test-storage";

describe("MockAuthService", () => {
  it("registers, verifies and signs in without persisting the plaintext password or verification code", async () => {
    const storage = createMemoryStorage();
    const database = createMockDatabase(storage);
    const auth = new MockAuthService(database);
    const password = "Example2026!";

    expect((await auth.register("owner@example.com", password)).ok).toBe(true);
    const verified = await auth.verifyEmail("owner@example.com", "654321");
    expect(verified.ok && verified.data.emailVerified).toBe(true);
    await auth.signOut();
    expect((await auth.signIn("OWNER@example.com", password)).ok).toBe(true);
    expect(storage.dump()).not.toContain(password);
    expect(storage.dump()).not.toContain("654321");
  });

  it("supports password reset without revealing whether an unknown email exists", async () => {
    const database = createMockDatabase(createMemoryStorage());
    const auth = new MockAuthService(database);

    expect((await auth.requestPasswordReset("unknown@example.com")).ok).toBe(true);
    await auth.requestPasswordReset("demo@shuicetong.cn");
    expect((await auth.resetPassword("demo@shuicetong.cn", "123456", "Updated2026!")).ok).toBe(true);
    expect((await auth.signIn("demo@shuicetong.cn", "Updated2026!")).ok).toBe(true);
  });
});
