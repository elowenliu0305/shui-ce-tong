import { expect, test } from "@playwright/test";

test("demo account completes the assessment and opens a contextual Agent answer", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "直接进入演示账号" }).click();
  await expect(page.getByRole("heading", { name: "杭州星云智创科技有限公司" })).toBeVisible();

  await page.getByRole("link", { name: "开始体检" }).click();
  await page.getByRole("link", { name: "开始体检" }).click();
  await page.getByRole("link", { name: /手工填写/ }).click();
  await page.getByRole("button", { name: "保存并进入风险自测" }).click();

  for (let index = 0; index < 10; index += 1) {
    await page.getByRole("radio").first().click();
    await page.getByRole("button", { name: index === 9 ? "查看摘要" : "下一题" }).click();
  }
  await expect(page.getByText("100%").first()).toBeVisible();
  await page.getByRole("button", { name: "确认并开始分析" }).click();
  await expect(page.getByRole("heading", { name: "税务体检报告" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("100").first()).toBeVisible();

  await page.getByRole("link", { name: "AI", exact: true }).click();
  await page.getByLabel("向 AI 提问").fill("研发费用加计扣除有什么依据？");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByRole("link", { name: /研发费用税前加计扣除政策指引/ })).toBeVisible();
});
