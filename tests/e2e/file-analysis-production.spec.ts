import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "直接进入演示账号" }).click();
}

async function upload(page: Page, name: string) {
  await page.goto("/files");
  await page.getByLabel("选择企业文件").setInputFiles({
    name,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-demo"),
  });
  await page.getByRole("button", { name: "下一步：选择任务" }).click();
  await page.getByRole("button", { name: "开始上传并分析" }).click();
}

test.beforeEach(async ({ page }) => { await signIn(page); });

test("文件流程显示未读取状态，失败时不生成事实并可彻底删除记录", async ({ page }) => {
  await upload(page, "企业资料.pdf");
  await expect(page.getByRole("heading", { name: "文件流程完成" })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".status-badge").getByText("未读取", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "查看文件记录" }).click();
  await expect(page.getByText("企业资料.pdf")).toBeVisible();

  await upload(page, "模拟失败.pdf");
  await expect(page.getByRole("heading", { name: "文件处理失败" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/没有生成未经验证的文件事实/)).toBeVisible();
  await page.getByRole("link", { name: "查看文件记录" }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByText("模拟失败.pdf").locator("xpath=ancestor::article").getByRole("button", { name: "删除" }).click();
  await expect(page.getByText("模拟失败.pdf")).toHaveCount(0);
});

test("文件历史随当前企业隔离，切回原企业后恢复", async ({ page }) => {
  await upload(page, "A企业文件.pdf");
  await expect(page.getByRole("heading", { name: "文件流程完成" })).toBeVisible({ timeout: 10_000 });
  await page.goto("/enterprises/new");
  await page.getByLabel("企业名称 *").fill("上海文件测试企业");
  await page.getByLabel("省份 *").fill("上海市");
  await page.getByLabel("城市 *").fill("上海市");
  await page.getByLabel("所属行业 *").selectOption({ label: "制造业" });
  await page.getByRole("button", { name: "创建并进入首页" }).click();
  await page.goto("/files/history");
  await expect(page.getByText("还没有文件记录")).toBeVisible();
  await page.goto("/enterprises");
  await page.getByRole("button", { name: "切换为当前企业" }).click();
  await page.goto("/files/history");
  await expect(page.getByText("A企业文件.pdf")).toBeVisible();
});
