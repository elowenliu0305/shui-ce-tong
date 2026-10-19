import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "直接进入演示账号" }).click();
});

test("searches, favorites and keeps the item visible in account assets", async ({ page }) => {
  await page.getByRole("link", { name: "资料", exact: true }).click();
  await page.getByRole("link", { name: /搜索标题/ }).click();
  await page.getByLabel("搜索资料").fill("研发费用");
  await page.getByRole("button", { name: "搜索" }).click();
  await page.getByRole("link", { name: /研发费用税前加计扣除政策指引/ }).click();
  await page.getByRole("button", { name: "♡ 收藏" }).click();
  await expect(page.getByRole("button", { name: "♥ 已收藏" })).toBeVisible();
  await page.goto("/favorites");
  await expect(page.getByRole("link", { name: /研发费用税前加计扣除政策指引/ })).toBeVisible();
});

test("runs the file flow without claiming unread content was analyzed", async ({ page }) => {
  await page.goto("/files");
  await page.locator('input[type="file"]').setInputFiles({ name: "研发辅助账.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("demo") });
  await expect(page.getByText("研发辅助账.xlsx")).toBeVisible();
  await page.getByRole("button", { name: "下一步：选择任务" }).click();
  await page.getByRole("button", { name: /研发费用归集/ }).click();
  await page.getByRole("button", { name: "开始上传并分析" }).click();
  await expect(page.getByRole("heading", { name: "文件流程完成" })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".status-badge").getByText("未读取", { exact: true })).toBeVisible();
  await expect(page.getByText("系统未读取文件正文")).toBeVisible();
});
