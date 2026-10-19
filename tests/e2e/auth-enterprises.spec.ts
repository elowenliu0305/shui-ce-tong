import { expect, test } from "@playwright/test";

const configured = Boolean(process.env.SUPABASE_E2E_EMAIL && process.env.SUPABASE_E2E_PASSWORD);

test.describe("production auth and enterprise isolation", () => {
  test.skip(!configured, "requires isolated Supabase E2E credentials");

  test("verified user can sign in and reach persisted enterprise state", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("邮箱").fill(process.env.SUPABASE_E2E_EMAIL ?? "");
    await page.getByLabel("密码").fill(process.env.SUPABASE_E2E_PASSWORD ?? "");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("当前企业")).toBeVisible();
  });
});
