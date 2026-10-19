import { expect, test, type Page } from "@playwright/test";

async function ask(page: Page, question: string, expected: string | RegExp) {
  await page.getByLabel("向 AI 提问").fill(question);
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText(expected).last()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "直接进入演示账号" }).click();
  await page.goto("/agent");
});

test("四类问题按规则路由，税务引用可打开且无依据时明确降级", async ({ page }) => {
  await ask(page, "如何做一次有效的项目复盘？", /我可以协助梳理/);
  await ask(page, "怎么改善现金流？", /13 周的现金流/);
  await ask(page, "研发费用加计扣除有什么依据？", /根据已检索资料/);
  const source = page.getByRole("link", { name: /研发费用税前加计扣除政策指引/ }).last();
  await expect(source).toBeVisible();
  await source.click();
  await expect(page.getByRole("heading", { name: "资料详情" })).toBeVisible();
  await page.goBack();

  await ask(page, "火星矿产资源税政策是什么？", /没有检索到足够可靠的依据/);
  await expect(page.getByText("依据不足")).toBeVisible();
  await ask(page, "我的企业体检报告先处理哪个风险？", /没有可用的报告上下文/);
});

test("历史会话按当前企业隔离，切换回原企业后可继续查看", async ({ page }) => {
  await ask(page, "怎么改善现金流？", /13 周的现金流/);
  await page.getByRole("link", { name: "历史会话" }).click();
  await expect(page.getByRole("link", { name: /怎么改善现金流/ })).toBeVisible();

  await page.goto("/enterprises/new");
  await page.getByLabel("企业名称 *").fill("上海海星制造有限公司");
  await page.getByLabel("省份 *").fill("上海市");
  await page.getByLabel("城市 *").fill("上海市");
  await page.getByLabel("所属行业 *").selectOption({ label: "制造业" });
  await page.getByRole("button", { name: "创建并进入首页" }).click();
  await page.goto("/agent/history");
  await expect(page.getByText("还没有会话")).toBeVisible();

  await page.goto("/enterprises");
  await page.getByRole("button", { name: "切换为当前企业" }).click();
  await page.goto("/agent/history");
  await expect(page.getByRole("link", { name: /怎么改善现金流/ })).toBeVisible();
});
