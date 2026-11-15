import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// These fixtures test interaction contracts, never soil/crop predictive accuracy.
const references = JSON.parse(
  readFileSync(
    resolve("..", "data/reference/crop-requirements-v1.json"),
    "utf8",
  ),
).profiles;
const summary = (value: number | null) => ({
  median: value,
  min: value,
  max: value,
});
const climate = {
  reference_days: 152,
  complete_seasons: 9,
  excluded_years: [],
  temperature_c: summary(26),
  rainfall_mm: summary(700),
  root_wetness: summary(0.4),
  longest_dry_run_days: summary(5),
  temperature_matching_seasons: 9,
};

async function mockSoil(page: import("@playwright/test").Page) {
  await page.route("**/api/soil/assess", (route) =>
    route.fulfill({
      json: {
        schema: "regional-soil-v1",
        region: route.request().postDataJSON(),
        status: "partial",
        properties: [
          {
            id: "phh2o",
            label: "Soil pH in water",
            unit: "pH",
            median: 5.4,
            p10: 5.1,
            p90: 5.9,
            status: "available",
            valid_samples: 1,
            total_samples: 1,
            sampled_coverage_fraction: 1,
            provenance: { retrieved_at: "2026-11-15" },
          },
        ],
        wetness: {
          status: "unavailable",
          reason: "Synthetic source outage fixture",
        },
        laboratory_references: [],
        assessment: { limitations: [] },
      },
    }),
  );
}

test("saved plots, season records, laboratory notes and portable backups survive reload", async ({
  page,
}) => {
  await page.goto("/?workspace=planning");
  await expect(
    page.getByRole("heading", {
      name: "Understand the soil beneath a region.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Recalculate assumptions" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("What remains outside this MVP", { exact: true }),
  ).toHaveCount(0);
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
  await page.reload();
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

test("crop guide explains seasonal evidence, missing values, future scenarios and changed plans", async ({
  page,
}) => {
  await mockSoil(page);
  await page.route("**/api/planting/assess", (route) => {
    const request = route.request().postDataJSON();
    return route.fulfill({
      json: {
        request,
        status: "available",
        history: {
          first_year: 2016,
          last_year: 2025,
          status: "available",
          spatial_support: "Synthetic point fixture",
          failures: [],
          monthly: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            complete_years: i === 0 ? 0 : 10,
            temperature_c: summary(i === 0 ? null : 26),
            rainfall_mm: summary(i === 0 ? null : 100 + i * 10),
          })),
        },
        crops: references
          .slice(0, 2)
          .map((reference: (typeof references)[0]) => ({
            id: reference.id,
            name: reference.name,
            species: reference.species,
            family: reference.family,
            status: "reference_match",
            soil_ph: 5.4,
            checks: { ph: "within_reference", temperature: "within_reference" },
            ph_spatial_range: [5.1, 5.9],
            reference,
            climate,
            planting_reference: `${request.planning_year}-06-01`,
            indicative_harvest_window: [
              `${request.planning_year}-10-01`,
              `${request.planning_year}-11-01`,
            ],
            needs_checking: [
              "Synthetic fixture; field water balance still needed.",
            ],
          })),
        method: {
          cycle_source: "https://www.fao.org/4/s2022e/s2022e07.htm",
          duration_assumption: "Synthetic test fixture",
          water_note: "Water adequacy is not established.",
          accuracy: "Not field validation",
        },
      },
    });
  });
  await page.route("**/api/planting/future", (route) =>
    route.fulfill({
      json: {
        request: route.request().postDataJSON(),
        first_year: 2027,
        last_year: 2036,
        scenario: "ssp245",
        models: ["ACCESS-CM2", "MRI-ESM2-0"].map((id, i) => ({
          id,
          status: i ? "partial" : "available",
          crops: references.map((reference: (typeof references)[0]) => ({
            id: reference.id,
            name: reference.name,
            climate,
          })),
          failures: [],
        })),
        limitations: ["Synthetic fixture, not an exact-year forecast"],
        paper: "https://doi.org/10.1038/s41597-022-01393-4",
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Assess selected region" }).click();
  await page.getByLabel("Planting month").selectOption("6");
  await page.getByLabel("Planning year").selectOption("2027");
  await page
    .getByRole("button", { name: "Explore crops and past seasons" })
    .click();
  await expect(
    page.getByRole("heading", { name: "What have past seasons been like?" }),
  ).toBeVisible();
  await expect(page.locator(".rain-month")).toHaveCount(12);
  await expect(page.locator(".rain-unknown")).toHaveCount(1);
  await page.locator(".crop-row > summary").first().click();
  await expect(
    page
      .locator(".crop-row")
      .first()
      .getByText("9 of 9 complete past seasons.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore future climate" }).click();
  await expect(
    page.getByRole("rowheader", { name: "MRI-ESM2-0", exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("partial — some data could not be used", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("What matters most?").selectOption("shorter_season");
  await expect(
    page.getByText("Planting options changed.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Explore future climate" }),
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
});

test("manual place search locates a small starting box and map controls remain accessible", async ({
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
  await page.goto("/");
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
  await expect(
    page.getByText("The starting box is approximate", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".region-size")).toContainText("hectares selected");
  await page
    .getByRole("button", { name: "Places & roads", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Places & roads", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await page.getByRole("button", { name: "Satellite", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Satellite", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
