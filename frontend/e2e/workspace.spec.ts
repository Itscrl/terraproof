import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("real NASA replay, economics, persistence, exports and validation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByText("10 years with weather data for both plans"),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "7.1", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Month to sow seeds").first().selectOption("5");
  await expect(
    page.getByText("You have changed the inputs.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Compare weather" }).click();
  await expect(
    page.getByText("You have changed the inputs.", { exact: false }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Costs & income", exact: true })
    .click();
  await page
    .getByLabel("June planting: Farm area (hectares)", { exact: true })
    .fill("2");
  await page.getByRole("button", { name: "Update estimate" }).click();
  await expect(
    page.locator(".money-summary").first().locator("strong"),
  ).toHaveText("₱90,000.00");
  await page
    .getByRole("button", { name: "Saved comparisons", exact: true })
    .click();
  const title = `Browser verification ${Date.now()}`;
  await page.getByLabel("Comparison title").fill(title);
  await page
    .getByRole("button", { name: "Save comparison", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Saved comparisons", exact: true })
    .click();
  const row = page.locator(".saved-list article").filter({ hasText: title });
  const csvPromise = page.waitForEvent("download");
  await row.getByRole("link", { name: "Daily CSV" }).click();
  expect((await csvPromise).suggestedFilename()).toBe("terraproof-daily.csv");
  await row.getByRole("button", { name: "Open comparison" }).click();
  await expect(page.getByLabel("Month to sow seeds").first()).toHaveValue("5");
  const jsonPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download results" }).click();
  expect((await jsonPromise).suggestedFilename()).toBe(
    "terraproof-comparison.json",
  );
  await page
    .getByRole("button", { name: "Saved comparisons", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Delete ${title}`, exact: true })
    .click();
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Compare dates", exact: true })
    .click();
  await page.getByLabel("Month to sow seeds").first().selectOption("2");
  await page.getByLabel("Day of month").first().fill("30");
  await page.getByRole("button", { name: "Compare weather" }).click();
  await expect(page.getByRole("alert")).toContainText("day");
  expect(errors).toEqual([]);
});

test("responsive pages, accessibility and visual evidence", async ({
  page,
}, testInfo) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(
      page.getByText("10 years with weather data for both plans"),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`comparison-${width}.png`),
      fullPage: true,
    });
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
    if (width === 1440 || width === 390) {
      for (const name of [
        "Costs & income",
        "How it works",
        "Saved comparisons",
      ]) {
        if (width < 680)
          await page.getByRole("button", { name: "Open navigation" }).click();
        await page.getByRole("button", { name, exact: true }).click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(
            `${name.split(" ")[0].toLowerCase()}-${width}.png`,
          ),
          fullPage: true,
        });
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(scan.violations).toEqual([]);
      }
    }
  }
});

test("keyboard entry and failed request recovery", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("10 years with weather data for both plans"),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to workspace" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.route("**/api/compare", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "NASA source unavailable. Use bundled data or retry.",
      }),
    }),
  );
  await page.getByRole("button", { name: "Compare weather" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "NASA source unavailable",
  );
  await page.unroute("**/api/compare");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
