import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { mockSoil, mockPlanting, openGlobe, openMarket } from "./helpers";

test.use({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });

test("saved plots, season records, laboratory notes and portable backups survive reload", async ({
  page,
}) => {
  await openGlobe(page, "/?workspace=planning");
  // The legacy calculator URL must load the globe and its packaged runtime,
  // independently of the optional live soil-provider test.
  await expect(page.locator(".cesium-widget canvas")).toBeVisible();
  const globeAssets = await page.request.get(
    "/cesium/Assets/approximateTerrainHeights.json",
  );
  expect(globeAssets.ok()).toBeTruthy();
  expect(await globeAssets.json()).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Recalculate assumptions" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("What remains outside this MVP", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Saved Plots", exact: true }).click();
  await page.locator(".farm-notebook > summary").click();
  await page
    .getByLabel("Name this plot")
    .fill("Browser test plot — synthetic records");
  await page.getByRole("button", { name: "Save selected plot" }).click();
  await page.getByText("Record what you planted", { exact: true }).click();
  await page
    .getByLabel("Crop planted", { exact: true })
    .fill("Rice (synthetic test entry)");
  await page.getByLabel("Actual planting date").fill("2025-06-01");
  await page
    .getByLabel("Management notes")
    .fill("Test notes, not real management observations.");
  await page.getByRole("button", { name: "Add planting record" }).click();
  await page.getByText("Record a laboratory pH test", { exact: true }).click();
  await page.getByLabel("Sample date", { exact: true }).fill("2025-05-01");
  await page.getByLabel("Sample depth", { exact: true }).fill("0–15 cm");
  await page.getByLabel("pH measured in water", { exact: true }).fill("5.5");
  await page.getByLabel("Lab / report reference").fill("Synthetic test report");
  await page.getByRole("button", { name: "Add soil-test record" }).click();
  await page
    .getByRole("button", { name: "Remove soil record 2025-05-01", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Synthetic test report", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Undo last removal" }).click();
  await expect(
    page.getByRole("cell", { name: "Synthetic test report", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export notebook" }).click();
  expect((await download).suggestedFilename()).toBe(
    "terraproof-farm-notebook.json",
  );
  await openGlobe(page);
  await page.getByRole("button", { name: "Saved Plots", exact: true }).click();
  await page.locator(".farm-notebook > summary").click();
  await expect(
    page.getByText("2025-06-01 · Rice (synthetic test entry)", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Synthetic test report", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Import backup").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":0}'),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Existing records were preserved",
  );
  await expect(
    page.getByRole("cell", { name: "Synthetic test report", exact: true }),
  ).toBeVisible();
});

test("season and water choices request new crop evidence before comparison", async ({
  page,
}) => {
  const errors: string[] = [];
  const requests: Record<string, any>[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockSoil(page);
  await mockPlanting(page, (body) => requests.push(body));
  await openGlobe(page);
  await openMarket(page);
  const guide = page.locator("#planting-guide");
  await expect(guide.getByRole("radio")).toHaveCount(12);
  await guide.getByRole("radio", { name: /^Jun/ }).click();
  await expect.poll(() => requests.at(-1)?.planting_month).toBe(6);
  await guide
    .getByRole("button", { name: "Canal / Pump", exact: true })
    .click();
  await expect.poll(() => requests.at(-1)?.water_supply).toBe("irrigation");
  await guide
    .getByRole("button", { name: "Fast Harvest", exact: true })
    .click();
  await expect.poll(() => requests.at(-1)?.priority).toBe("shorter_season");
  await guide
    .getByRole("button", { name: /Next: Compare Crop Pictures/ })
    .click();
  await expect(
    guide.getByRole("heading", {
      name: "2. Compare Crop Pictures & Buyer Demand",
    }),
  ).toBeVisible();
  const crops = guide
    .getByRole("radiogroup", { name: "Select crop to inspect market trend" })
    .getByRole("radio");
  await expect(crops).toHaveCount(4);
  await crops.nth(1).click();
  await expect(crops.nth(1)).toHaveAttribute("aria-checked", "true");
  await guide.getByRole("slider").fill("10");
  await expect(guide.getByText("Higher Prices", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("manual place search, bounds and globe camera controls", async ({
  page,
}) => {
  let searches = 0;
  await page.route("**/api/places/search?**", (route) => {
    searches++;
    return route.fulfill({
      json: {
        places: [
          {
            label: "Legazpi, Albay, Philippines — test result",
            latitude: 13.14,
            longitude: 123.74,
          },
        ],
      },
    });
  });
  await openGlobe(page);
  await page
    .getByLabel("Find your land", { exact: true })
    .fill("Legazpi Albay");
  expect(searches).toBe(0);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Legazpi, Albay, Philippines — test result",
      exact: true,
    })
    .click();
  expect(searches).toBe(1);
  expect(
    Number(await page.getByLabel("West longitude or latitude").inputValue()),
  ).toBeLessThan(123.74);
  expect(
    Number(await page.getByLabel("East longitude or latitude").inputValue()),
  ).toBeGreaterThan(123.74);
  for (const label of ["Places & roads", "Satellite"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await page.getByRole("button", { name: "Hide Panel", exact: true }).click();
  await expect(page.locator("#soil-region")).toHaveCount(0);
  await page.getByRole("button", { name: "Soil Panel", exact: true }).click();
  await expect(page.locator("#soil-region")).toBeVisible();
});

test("rotation choices reach the printable report and saved evidence", async ({
  page,
}) => {
  await mockSoil(page);
  await mockPlanting(page);
  await page.addInitScript(() => {
    window.print = () => {
      (window as any).__printed = true;
    };
  });
  await openGlobe(page);
  await openMarket(page);
  const guide = page.locator("#planting-guide");
  await guide.getByRole("button", { name: /Rotation & Checks/ }).click();
  const choices = guide
    .getByRole("radiogroup", { name: "Select second-season rotation crop" })
    .getByRole("radio");
  await expect(choices).toHaveCount(3);
  await choices.filter({ hasText: "Groundnut (Peanut)" }).click();
  await expect(
    choices.filter({ hasText: "Groundnut (Peanut)" }),
  ).toHaveAttribute("aria-checked", "true");
  await guide
    .getByRole("button", { name: "Mark All 3 Checks Ready", exact: true })
    .click();
  await expect(guide.getByText("3 of 3 Ready", { exact: true })).toBeVisible();
  await guide
    .getByRole("button", { name: "Reset Checklist", exact: true })
    .click();
  await expect(guide.getByText("0 of 3 Ready", { exact: true })).toBeVisible();
  await guide
    .getByRole("button", {
      name: "Finish: Open Final Result & Print Story",
      exact: true,
    })
    .click();
  const sheet = page.locator("#custom-printable-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("Groundnut");
  await page
    .getByLabel("Editable farm or parcel title")
    .fill("Synthetic test farm");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save File", exact: true }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("terraproof-decision-brief.json");
  const evidence = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(evidence.farmName).toBe("Synthetic test farm");
  expect(evidence.plantingReport.crops).toHaveLength(7);
  await page
    .getByRole("button", { name: "Print / Save PDF", exact: true })
    .click();
  expect(await page.evaluate(() => (window as any).__printed)).toBe(true);
  await page.getByRole("button", { name: "Hide AI", exact: true }).click();
  await expect(
    page.getByLabel("Ask AI to customize the print output"),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "2. Crops & Market", exact: true })
    .click();
  await expect(page.locator("#planting-guide")).toBeVisible();
});

test("keyboard region controls remain accessible and views fit narrow screens", async ({
  page,
}, testInfo) => {
  await openGlobe(page);
  await page.getByText("Adjust map boundary manually", { exact: true }).click();
  const west = page.getByLabel("West longitude or latitude");
  await west.focus();
  await expect(west).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("South longitude or latitude")).toBeFocused();
  const audit = await new AxeBuilder({ page })
    .include("#soil-region")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const search = page.getByRole("searchbox", { name: "Find your land" });
    await search.scrollIntoViewIfNeeded();
    const searchBox = await search.boundingBox();
    expect(searchBox).not.toBeNull();
    expect(searchBox!.x).toBeGreaterThanOrEqual(0);
    expect(searchBox!.x + searchBox!.width).toBeLessThanOrEqual(width);
    await page
      .getByRole("button", { name: "Saved Plots", exact: true })
      .click();
    await page.locator(".farm-notebook > summary").click();
    if (width === 1440) {
      await page.getByLabel("Name this plot").fill("Responsive test plot");
      await page.getByRole("button", { name: "Save selected plot" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "Plot saved" }),
      ).toBeVisible();
    }
    await page.getByText("Record what you planted", { exact: true }).click();
    await page
      .getByLabel("Crop planted", { exact: true })
      .fill(`Test at ${width}px`);
    await page
      .getByRole("button", { name: "Saved Plots", exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: testInfo.outputPath(`globe-${width}.png`),
      fullPage: true,
    });
  }
});
