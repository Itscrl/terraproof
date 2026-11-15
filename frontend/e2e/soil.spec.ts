import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mockPlanting, openGlobe, soilFixture } from "./helpers";

test.use({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });

test("globe controls, assessment retry, evidence export and changed boundaries", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockPlanting(page);
  let fail = true;
  await page.route("**/api/soil/assess", (route) =>
    fail
      ? route.fulfill({
          status: 503,
          json: { detail: "Provider unavailable; retry assessment." },
        })
      : route.fulfill({ json: soilFixture(route.request().postDataJSON()) }),
  );
  await openGlobe(page);
  await page
    .getByRole("button", { name: "Draw a region", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel box", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel box", exact: true }).click();
  await page.getByText("Adjust map boundary manually", { exact: true }).click();
  await page.getByLabel("West longitude or latitude").fill("-95");
  await page.getByLabel("East longitude or latitude").fill("-94.9");
  await page
    .getByRole("button", { name: "Check Soil Health", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Provider unavailable");
  fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Refresh Soil Check", exact: true }),
  ).toBeVisible();
  await page.locator(".soil-property summary").first().click();
  await expect(page.locator(".soil-property p").first()).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save soil summary file", exact: true })
    .click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("terraproof-soil-report.json");
  const evidence = JSON.parse(readFileSync((await file.path())!, "utf8"));
  expect(evidence.region.west).toBe(-95);
  expect(evidence.properties[0].valid_samples).toBe(10);
  expect(evidence.wetness.status).toBe("unavailable");
  await page.getByLabel("Soil root layer").selectOption("5-15cm");
  await expect(page.locator(".soil-stale")).toContainText("Location changed");
  await page.getByLabel("East longitude or latitude").fill("-96");
  await expect(
    page.getByRole("button", { name: "Check Soil Health", exact: true }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("live soil selection and real data evidence", async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.TERRAPROOF_LIVE_SOIL !== "1",
    "Opt-in live imagery/soil-provider check",
  );
  test.setTimeout(180000);
  await openGlobe(page);
  await page.getByRole("button", { name: "Albay Sample", exact: true }).click();
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/soil/assess") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Check Soil Health", exact: true })
    .click();
  const data = await (await response).json();
  expect(
    data.properties.filter((p: { status: string }) => p.status === "available"),
  ).toHaveLength(8);
  await expect(page.locator(".soil-property")).toHaveCount(8);
  await expect(page.locator(".globe-failure")).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("live-soil-globe.png"),
    fullPage: true,
  });
});
