import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function compareExample(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Show my comparison", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "June 1 or July 1?" }),
  ).toBeVisible();
}

test("guided dates, income, persistence, exports and input validation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "When would you like to sow rice?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save comparison", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "June 1 or July 1?" }),
  ).toHaveCount(0);
  await compareExample(page);
  await expect(
    page.getByRole("heading", { name: /June 1 had about 1.8 fewer/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change dates", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Month", exact: true })
    .selectOption("5");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Show my comparison", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "May 1 or July 1?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Estimate my income", exact: true })
    .click();
  await page.getByLabel("Farm area in hectares", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Calculate my income", exact: true })
    .click();
  await expect(page.locator(".income-answer h2")).toHaveText("₱90,000.00");
  await page
    .getByRole("button", { name: "Adjust my amounts", exact: true })
    .click();
  await page
    .getByLabel("Total expenses in pesos per hectare", { exact: true })
    .fill("60000");
  await page
    .getByRole("button", { name: "Calculate my income", exact: true })
    .click();
  await expect(page.locator(".income-answer h2")).toHaveText("₱60,000.00");
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
  const csv = page.waitForEvent("download");
  await row.getByRole("link", { name: "Daily CSV" }).click();
  expect((await csv).suggestedFilename()).toBe("terraproof-daily.csv");
  await row.getByRole("button", { name: "Open comparison" }).click();
  await expect(
    page.getByRole("heading", { name: "May 1 or July 1?" }),
  ).toBeVisible();
  const json = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download results", exact: true })
    .click();
  expect((await json).suggestedFilename()).toBe("terraproof-comparison.json");
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
  await page.getByRole("button", { name: "Change dates", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Month", exact: true })
    .selectOption("2");
  await page.getByLabel("Day", { exact: true }).fill("30");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  expect(
    await page
      .getByLabel("Day", { exact: true })
      .evaluate((el: HTMLInputElement) => el.checkValidity()),
  ).toBe(false);
  await expect(
    page.getByRole("heading", { name: "When would you like to sow rice?" }),
  ).toBeVisible();
  await page.getByLabel("Day", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Month", exact: true })
    .selectOption("2");
  await page
    .getByRole("button", { name: "Show my comparison", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Both dates are the same",
  );
  await page
    .getByRole("combobox", { name: "Month", exact: true })
    .selectOption("3");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("guided screens remain accessible and fit desktop and small phones", async ({
  page,
}, testInfo) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "When would you like to sow rice?" }),
    ).toBeVisible();
    for (const step of ["first-date", "second-date", "results", "income"]) {
      if (step === "second-date")
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
      if (step === "results") {
        await page
          .getByRole("button", { name: "Show my comparison", exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: "June 1 or July 1?" }),
        ).toBeVisible();
      }
      if (step === "income")
        await page
          .getByRole("button", { name: "Estimate my income", exact: true })
          .click();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`${step}-${width}.png`),
        fullPage: true,
      });
    }
  }
});

test("keyboard entry and failed comparison retry preserve the task", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "When would you like to sow rice?" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to workspace" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.route("**/api/compare", (route) =>
    route.fulfill({
      status: 503,
      json: { detail: "NASA source unavailable. Please retry." },
    }),
  );
  await page
    .getByRole("button", { name: "Show my comparison", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "NASA source unavailable",
  );
  await page.unroute("**/api/compare");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "June 1 or July 1?" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("number fields can be cleared and retyped without inserting a leading zero", async ({
  page,
}) => {
  await page.goto("/");
  const day = page.getByRole("spinbutton", { name: "Day", exact: true });
  await day.click();
  await day.press("ControlOrMeta+A");
  await day.press("Backspace");
  await expect(day).toHaveValue("");
  await day.pressSequentially("20");
  await expect(day).toHaveValue("20");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Costs & income", exact: true })
    .click();
  const harvest = page.getByLabel("Expected harvest in kilograms per hectare", {
    exact: true,
  });
  await harvest.click();
  await harvest.press("ControlOrMeta+A");
  await harvest.press("Backspace");
  await expect(harvest).toHaveValue("");
  let calls = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/compare") && r.method() === "POST") calls++;
  });
  await page
    .getByRole("button", { name: "Calculate my income", exact: true })
    .click();
  expect(calls).toBe(0);
  await expect(harvest).toHaveValue("");
  await harvest.pressSequentially("2000");
  await expect(harvest).toHaveValue("2000");
  const area = page.getByLabel("Farm area in hectares", { exact: true });
  await area.click();
  await area.press("ControlOrMeta+A");
  await area.press("Backspace");
  await area.pressSequentially("0.5");
  await expect(area).toHaveValue("0.5");
  await page
    .getByRole("button", { name: "Calculate my income", exact: true })
    .click();
  await expect(page.locator(".income-answer h2")).toHaveText("-₱2,500.00");
});
