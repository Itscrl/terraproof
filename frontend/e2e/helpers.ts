import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Synthetic API fixtures verify UI behavior, never crop or market accuracy.
export const references = JSON.parse(
  readFileSync(
    resolve("..", "data/reference/crop-requirements-v1.json"),
    "utf8",
  ),
).profiles;
const summary = (n: number | null) => ({ median: n, min: n, max: n });
export function plantingFixture(request: Record<string, any>) {
  return {
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
        complete_years: 10,
        temperature_c: summary(26),
        rainfall_mm: summary(100 + i * 10),
      })),
    },
    crops: references.map((reference: any) => ({
      ...reference,
      reference,
      status: "reference_match",
      soil_ph: 5.4,
      checks: { ph: "within_reference", temperature: "within_reference" },
      ph_spatial_range: [5.1, 5.9],
      climate: {
        reference_days: 152,
        complete_seasons: 9,
        excluded_years: [],
        temperature_c: summary(26),
        rainfall_mm: summary(700),
        root_wetness: summary(0.4),
        longest_dry_run_days: summary(5),
        temperature_matching_seasons: 9,
      },
      planting_reference: `${request.planning_year}-${String(request.planting_month).padStart(2, "0")}-01`,
      indicative_harvest_window: [
        `${request.planning_year}-10-01`,
        `${request.planning_year}-11-01`,
      ],
      needs_checking: ["Synthetic fixture; field water balance still needed."],
    })),
    method: {
      cycle_source: "https://www.fao.org/4/s2022e/s2022e07.htm",
      duration_assumption: "Synthetic fixture",
      water_note: "Water adequacy is not established.",
      accuracy: "Not field validation",
    },
  };
}
export function soilFixture(region: Record<string, any>) {
  return {
    schema: "regional-soil-v1",
    region,
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
        valid_samples: 10,
        total_samples: 20,
        sampled_coverage_fraction: 0.5,
        provenance: {
          retrieved_at: "2026-11-15",
          source: "synthetic test fixture",
        },
      },
    ],
    wetness: { status: "unavailable", reason: "Synthetic upstream outage" },
    laboratory_references: [],
    assessment: { limitations: [] },
  };
}
export async function mockPlanting(
  page: Page,
  observe?: (body: Record<string, any>) => void,
) {
  await page.route("**/api/planting/assess", (route) => {
    const body = route.request().postDataJSON();
    observe?.(body);
    return route.fulfill({ json: plantingFixture(body) });
  });
}
export async function mockSoil(page: Page) {
  await page.route("**/api/soil/assess", (route) =>
    route.fulfill({ json: soilFixture(route.request().postDataJSON()) }),
  );
}
export async function openGlobe(page: Page, path = "/") {
  await page.goto(path);
  await expect(
    page.getByRole("heading", {
      name: "Simple Visual Guidance for What to Plant & When to Sell.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pinpoint Your Land", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Your Selected Farmland" }),
  ).toBeVisible();
  await expect(page.locator(".cesium-widget canvas")).toBeVisible();
}
export async function openMarket(page: Page) {
  await page
    .getByRole("button", { name: "Check Soil Health", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Refresh Soil Check", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Application workflow steps" })
    .getByRole("button", { name: "2. Market Analysis" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "1. Pick Your Planting Month & Water Setup",
    }),
  ).toBeVisible();
}
