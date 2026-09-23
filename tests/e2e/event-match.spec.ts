import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("clears stale cards while a new scenario is pending and after a server error", async ({ page }) => {
  await page.getByRole("button", { name: "A", exact: true }).click();
  await expect(page.locator(".vendor-card")).toHaveCount(3);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/recommend", async (route) => {
    await gate;
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Каталог временно недоступен" }) });
  });
  await page.getByRole("button", { name: "H", exact: true }).click();
  try {
    await expect(page.getByRole("button", { name: /Проверяем каталог/ })).toBeDisabled();
    await expect(page.locator(".vendor-card")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Проверяем условия подбора" })).toBeVisible();
  } finally {
    release();
  }
  await expect(page.locator("#results").getByRole("alert")).toContainText("Каталог временно недоступен");
  await expect(page.locator(".vendor-card")).toHaveCount(0);
});

test("editing the form cancels an in-flight response and uses the new conditions", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/recommend", async (route) => {
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  }, { times: 1 });
  await page.getByRole("button", { name: "A", exact: true }).click();
  await expect(page.getByRole("button", { name: /Проверяем каталог/ })).toBeDisabled();
  await page.getByLabel(/Дата/).fill("2026-10-13");
  release();
  await expect(page.getByRole("button", { name: "Подобрать подрядчиков" })).toBeEnabled();
  await expect(page.locator(".vendor-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Подобрать подрядчиков" }).click();
  await expect(page.locator(".vendor-card")).toHaveCount(3);
  await expect(page.locator(".vendor-card").nth(2)).toContainText("HK-35215");
  await expect(page.locator(".summary")).toContainText("2026-10-13");
});

test("submits the full form and keeps repeated results deterministic", async ({ page }) => {
  await page.getByRole("button", { name: "Подобрать подрядчиков" }).click();
  await expect(page.locator(".vendor-card")).toHaveCount(3);
  await expect(page.locator(".vendor-card").first()).toContainText("HK-88430");
  await page.getByRole("button", { name: "Подобрать подрядчиков" }).click();
  await expect(page.locator(".vendor-card").first()).toContainText("HK-88430");
  await expect(page.getByText("Проверенный fallback")).toBeVisible();
  const dimensions = await page.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.inner);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("removes meaningful transition duration", async ({ page }) => {
    const duration = await page.locator(".scenario-button").first().evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.00001);
  });
});

test("changing the date uses the calendar and changes only verified profiles", async ({ page }) => {
  await page.getByLabel(/Дата/).fill("2026-10-13");
  await page.getByRole("button", { name: "Подобрать подрядчиков" }).click();
  await expect(page.locator(".vendor-card")).toHaveCount(3);
  await expect(page.locator(".vendor-card").nth(2)).toContainText("HK-35215");
  await expect(page.getByText("HK-29829")).toHaveCount(0);
});

test("runs sparse and both empty-result demo scenarios through the backend", async ({ page }) => {
  await page.getByRole("button", { name: "C", exact: true }).click();
  await expect(page.locator(".vendor-card")).toHaveCount(2);
  await page.getByRole("button", { name: "E", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Категории нет в городе" })).toBeVisible();
  await page.getByRole("button", { name: "F", exact: true }).click();
  await expect(page.getByText(/поднять бюджет на 50 000 ₸/)).toBeVisible();
  await page.getByRole("button", { name: /Проверить бюджет/ }).click();
  await expect(page.locator(".vendor-card").first()).toContainText("HK-88430");
});

test("checks venue availability and displays source and imputation flags", async ({ page }) => {
  await page.getByRole("button", { name: "G", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Что исключило кандидатов" })).toBeVisible();
  await expect(page.getByText("заняты на дату: 1")).toBeVisible();
  await page.getByRole("button", { name: "H", exact: true }).click();
  await expect(page.locator(".vendor-card")).toHaveCount(1);
  await expect(page.locator(".vendor-card")).toContainText("HK-90012");
  await expect(page.getByText("Синтетический профиль исходного датасета")).toBeVisible();
  await expect(page.getByText("Цена дополнена")).toBeVisible();
  await page.getByText("Почему этот вариант").click();
  await expect(page.getByText(/отсутствует в списке занятых дат/)).toBeVisible();
});
