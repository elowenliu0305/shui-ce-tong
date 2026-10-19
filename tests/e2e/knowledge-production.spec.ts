import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "直接进入演示账号" }).click();
});

test("首页和资料库使用同一数据源并可按类型筛选", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "研发费用税前加计扣除政策指引" })).toBeVisible();
  await page.getByRole("link", { name: "资料", exact: true }).click();
  await expect(page.locator(".knowledge-card")).toHaveCount(4);

  await page.getByRole("tab", { name: "政策" }).click();
  await expect(page.locator(".knowledge-card")).toHaveCount(2);
  await expect(page.getByRole("link", { name: /研发费用税前加计扣除政策指引/ })).toBeVisible();

  await page.getByRole("tab", { name: "案例" }).click();
  await expect(page.locator(".knowledge-card")).toHaveCount(1);
  await expect(page.getByRole("link", { name: /制造业数字化转型案例/ })).toBeVisible();
});

test("全库搜索、详情、原文件和空状态形成闭环", async ({ page }) => {
  await page.goto("/knowledge");
  await page.getByRole("link", { name: /搜索标题/ }).click();
  await page.getByLabel("搜索资料").fill("财税演示〔2026〕01号");
  await page.getByRole("button", { name: "搜索" }).click();
  await expect(page.getByText("找到 1 条结果")).toBeVisible();
  await page.getByRole("link", { name: /小型微利企业所得税优惠政策摘要/ }).click();
  await expect(page.getByText("财税演示〔2026〕01号")).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("生产环境将打开短期签名链接");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "下载原文件" }).click();

  await page.goto("/knowledge/doc-digital-case");
  await expect(page.getByText("原文件未成功解析")).toBeVisible();
  await expect(page.getByRole("button", { name: "下载原文件" })).toBeEnabled();

  await page.goto("/search");
  await page.getByLabel("搜索资料").fill("不存在的政策关键词-0000");
  await page.getByRole("button", { name: "搜索" }).click();
  await expect(page.getByText("没有找到相关资料")).toBeVisible();
});
