import { expect, test, type Page } from "@playwright/test";

async function answerAssessment(page: Page, riskAnswers: number) {
  await page.goto("/assessment/method");
  await page.getByRole("link", { name: /手工填写/ }).click();
  await page.getByRole("button", { name: "保存并进入风险自测" }).click();
  for (let index = 0; index < 10; index += 1) {
    await page.getByRole("radio").nth(index < riskAnswers ? 1 : 0).click();
    await page.getByRole("button", { name: index === 9 ? "查看摘要" : "下一题" }).click();
  }
  await page.getByRole("button", { name: "确认并开始分析" }).click();
  await expect(page.getByRole("heading", { name: "税务体检报告" })).toBeVisible({ timeout: 10_000 });
}

test("two assessments create separately browsable immutable history snapshots", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "直接进入演示账号" }).click();

  await answerAssessment(page, 0);
  await expect(page.getByText("低风险")).toBeVisible();
  await expect(page.locator(".report-score b")).toHaveText("100");

  await answerAssessment(page, 3);
  await expect(page.getByText("中风险")).toBeVisible();
  await expect(page.locator(".report-score b")).toHaveText("70");

  await page.getByRole("link", { name: "历史", exact: true }).click();
  await expect(page.locator(".history-card")).toHaveCount(2);
  await page.locator(".history-card").nth(1).click();
  await expect(page.getByText("低风险")).toBeVisible();
  await expect(page.locator(".report-score b")).toHaveText("100");
});
