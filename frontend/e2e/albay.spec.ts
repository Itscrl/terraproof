import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Albay explorer links map selection, history and research reports", async ({
  page,
}, testInfo) => {
  // UI-only fixture: not a training dataset or evidence of agricultural accuracy.
  await page.route("**/api/research/albay", (route) =>
    route.fulfill({
      json: {
        available: true,
        message: "Municipal context",
        source_url: "https://ricelytics.philrice.gov.ph/",
        records: [
          {
            location: "City of Legazpi",
            psgc: "0500506000",
            year: 2024,
            period: "Annual",
            yield_t_ha: 3.5,
          },
          {
            location: "City of Legazpi",
            psgc: "0500506000",
            year: 2025,
            period: "Annual",
            yield_t_ha: 3.8,
          },
          {
            location: "Libon",
            psgc: "0500507000",
            year: 2025,
            period: "Annual",
            yield_t_ha: 4.23,
          },
          {
            location: "Libon",
            psgc: "0500507000",
            year: 2025,
            period: "Semester 1",
            yield_t_ha: 4.33,
          },
        ],
        geometry: {
          features: [
            {
              properties: {
                PSGC_CODE: "0500506000",
                ADM3_EN: "City of Legazpi",
              },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [123.7, 13.1],
                    [123.8, 13.1],
                    [123.8, 13.2],
                    [123.7, 13.1],
                  ],
                ],
              },
            },
            {
              properties: { PSGC_CODE: "0500507000", ADM3_EN: "Libon" },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [123.6, 13.1],
                    [123.7, 13.1],
                    [123.7, 13.2],
                    [123.6, 13.1],
                  ],
                ],
              },
            },
          ],
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Albay data", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Explore Albay rice data" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Selected municipal estimate" }),
  ).toContainText("3.8");
  await page
    .getByRole("button", { name: "Libon: 4.23 tonnes per hectare" })
    .click();
  await expect(page.getByLabel("Municipality or city")).toHaveValue(
    "0500507000",
  );
  await expect(
    page.getByRole("region", { name: "Selected municipal estimate" }),
  ).toContainText("4.23");
  await page.getByLabel("Reporting period").selectOption("Semester 1");
  await expect(
    page.getByRole("region", { name: "Selected municipal estimate" }),
  ).toContainText("4.33");
  await expect(
    page.getByRole("heading", { name: "Satellite soil moisture", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Reporting year").locator("option", { hasText: "2026" }),
  ).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Albay data" }).click();
  expect((await download).suggestedFilename()).toBe(
    "terraproof-albay-context.json",
  );
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
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
      path: testInfo.outputPath(`albay-fixture-${width}.png`),
      fullPage: true,
    });
  }
});

test("Albay unavailable state keeps experiment reports accessible", async ({
  page,
}) => {
  await page.route("**/api/research/albay", (route) =>
    route.fulfill({ json: { available: false, message: "No local download" } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Albay data", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Albay data is not available here yet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rice trial harvest", exact: true }),
  ).toBeVisible();
});
