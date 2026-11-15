import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("globe workspace, accessible coordinates, assessment and failure recovery", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let fail = true;
  await page.route("**/api/soil/assess", async (route) => {
    if (fail) {
      await route.fulfill({
        status: 503,
        json: { detail: "Provider unavailable; retry assessment." },
      });
      return;
    }
    const region = route.request().postDataJSON();
    await route.fulfill({
      json: {
        schema: "regional-soil-v1",
        region,
        created_at: "2026-11-15T00:00:00Z",
        status: "partial",
        properties: [
          {
            id: "phh2o",
            label: "Soil pH in water",
            unit: "pH",
            depth: region.depth,
            status: "available",
            median: 5.4,
            p10: 5.1,
            p90: 6,
            valid_samples: 10,
            total_samples: 20,
            sampled_coverage_fraction: 0.5,
            provenance: { retrieved_at: "2026-11-15", bytes: 1000 },
          },
        ],
        wetness: {
          status: "unavailable",
          reason: "Synthetic integration fixture; NASA unavailable",
        },
        assessment: {
          model: "Test fixture",
          source: "",
          statistics: "",
          uncertainty: "",
          limitations: [],
        },
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Understand the soil beneath a region.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Draw a region" }).click();
  await expect(
    page.getByRole("button", { name: "Cancel selection" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel selection" }).click();
  await page.getByText("Edit coordinates", { exact: true }).click();
  await page.getByLabel("West longitude or latitude").fill("-95");
  await page.getByLabel("East longitude or latitude").fill("-94.9");
  await page.getByRole("button", { name: "Assess selected region" }).click();
  await expect(page.getByRole("alert")).toContainText("Provider unavailable");
  fail = false;
  await page.getByRole("button", { name: "Retry assessment" }).click();
  await expect(
    page.getByText("1 of 1 mapped properties available", { exact: false }),
  ).toBeVisible();
  await page
    .locator(".soil-property")
    .getByText("Soil acidity (pH)", { exact: true })
    .click();
  await expect(
    page.getByText("10 / 20 valid samples", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Soil depth").selectOption("5-15cm");
  await expect(
    page.getByText("Selection changed.", { exact: false }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download soil report JSON" }).click();
  expect((await download).suggestedFilename()).toBe(
    "terraproof-soil-report.json",
  );
  await page.getByLabel("East longitude or latitude").fill("-96");
  await expect(
    page.getByRole("button", { name: "Assess selected region" }),
  ).toBeDisabled();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("live soil selection and real data evidence", async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.TERRAPROOF_LIVE_SOIL !== "1",
    "Explicit live-source check; requires provider network access",
  );
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  const tile = page.waitForResponse(
    (response) =>
      response.url().includes("gibs.earthdata.nasa.gov") &&
      response.status() === 200,
  );
  await page.goto("/");
  await expect(page.locator(".cesium-widget canvas")).toBeVisible({
    timeout: 30000,
  });
  await tile;
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: testInfo.outputPath("globe-initial-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Albay example" }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Draw a region" }).click();
  const canvas = page.locator(".cesium-widget canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Globe canvas missing");
  await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.42);
  await page.getByRole("button", { name: "Cancel selection" }).click();
  await page.getByRole("button", { name: "Draw a region" }).click();
  await page.mouse.click(box.x + box.width * 0.44, box.y + box.height * 0.45);
  await expect(
    page.getByRole("button", { name: "Cancel selection" }),
  ).toBeVisible();
  await page.mouse.move(box.x + box.width * 0.56, box.y + box.height * 0.58);
  await page.mouse.click(box.x + box.width * 0.56, box.y + box.height * 0.58);
  await expect(
    page.getByRole("button", { name: "Draw a region" }),
  ).toBeVisible();
  // Restore the pinned reference region for the live provider and visual evidence.
  await page.getByRole("button", { name: "Albay example" }).click();
  await page.getByRole("button", { name: "Assess selected region" }).click();
  await expect(
    page.getByText("8 of 8 mapped properties available", { exact: false }),
  ).toBeVisible({ timeout: 90000 });
  await expect(
    page.getByRole("heading", { name: "Recent soil wetness" }),
  ).toBeVisible();
  await expect(page.locator(".globe-failure")).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: testInfo.outputPath("soil-desktop.png"),
    fullPage: true,
  });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: testInfo.outputPath(`soil-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("Planting month").selectOption("6");
  await page
    .getByRole("button", { name: "Explore crops and past seasons" })
    .click();
  await expect(page.locator(".crop-row")).toHaveCount(7, { timeout: 60000 });
  await page.getByRole("button", { name: "Explore future climate" }).click();
  await expect(
    page.getByText("Complete model extracts", { exact: true }),
  ).toHaveCount(2, { timeout: 90000 });
  await page.locator(".crop-row > summary").first().click();
  await page
    .locator(".planting-guide")
    .screenshot({ path: testInfo.outputPath("planting-desktop.png") });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page
      .locator(".planting-guide")
      .screenshot({ path: testInfo.outputPath(`planting-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByLabel("Find your land", { exact: true })
    .fill("Legazpi Albay Philippines");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.locator(".place-results button").first().click();
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle");
  await page
    .locator(".soil-map")
    .screenshot({ path: testInfo.outputPath("land-satellite-desktop.png") });
  const roadTile = page.waitForResponse(
    (response) =>
      response.url().includes("World_Topo_Map/MapServer/tile/") &&
      response.status() === 200,
  );
  await page
    .getByRole("button", { name: "Places & roads", exact: true })
    .click();
  await roadTile;
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page
    .locator(".soil-map")
    .screenshot({ path: testInfo.outputPath("land-roads-desktop.png") });
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  expect(errors).toEqual([]);
});
