import { expect, test } from "@playwright/test";

test("main pages do not overflow and primary controls keep accessible touch sizes", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "直接进入演示账号" }).click();
  for (const path of ["/", "/assessment", "/knowledge", "/agent", "/me"]) {
    await page.goto(path);
    const sizes = await page.evaluate(() => ({
      viewport: window.innerWidth,
      html: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    expect(sizes.html).toBeLessThanOrEqual(sizes.viewport);
    expect(sizes.body).toBeLessThanOrEqual(sizes.viewport);
  }
  const bottomTargets = await page.locator(".bottom-nav a").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  expect(bottomTargets.every((height) => height >= 44)).toBe(true);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});

test("knowledge filters stay compact when a tab has few or no results", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "直接进入演示账号" }).click();
  await page.goto("/knowledge");

  for (const name of ["全部", "政策", "时讯", "案例", "其他"]) {
    await page.getByRole("tab", { name }).click();
    const sizes = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      search: document.querySelector(".search-entry")?.getBoundingClientRect().height,
      tabs: document.querySelector(".filter-tabs")?.getBoundingClientRect().height,
      button: document.querySelector(".filter-tabs button")?.getBoundingClientRect().height
    }));
    expect(sizes.overflow).toBe(0);
    expect(sizes.search).toBe(48);
    expect(sizes.tabs).toBe(46);
    expect(sizes.button).toBe(38);
  }
});

test("agent composer stays visible above the bottom navigation", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "直接进入演示账号" }).click();
  await page.goto("/agent");

  const input = page.getByRole("textbox", { name: "向 AI 提问" });
  await expect(input).toBeVisible();

  const bounds = await page.evaluate(() => {
    const composer = document.querySelector(".chat-compose")?.getBoundingClientRect();
    const navigation = document.querySelector(".bottom-nav")?.getBoundingClientRect();
    const textbox = document.querySelector<HTMLInputElement>('.chat-compose input')?.getBoundingClientRect();
    return {
      composerBottom: composer?.bottom ?? Number.POSITIVE_INFINITY,
      navigationTop: navigation?.top ?? Number.NEGATIVE_INFINITY,
      textboxBottom: textbox?.bottom ?? Number.POSITIVE_INFINITY,
      viewportHeight: window.innerHeight
    };
  });

  expect(bounds.composerBottom).toBeLessThanOrEqual(bounds.navigationTop + 1);
  expect(bounds.textboxBottom).toBeLessThanOrEqual(bounds.navigationTop);
  expect(bounds.navigationTop).toBeLessThanOrEqual(bounds.viewportHeight);
});
