import type { Bounds } from "./soil-types";

export const NOTEBOOK_KEY = "terraproof.farm-notebook.v1";
export type SeasonRecord = {
  id: string;
  crop: string;
  plantingDate: string;
  notes: string;
};
export type SoilRecord = {
  id: string;
  sampleDate: string;
  depth: string;
  phWater: number;
  laboratory: string;
};
export type SavedPlot = {
  id: string;
  name: string;
  bounds: Bounds;
  depth: string;
  seasons: SeasonRecord[];
  samples: SoilRecord[];
};
export type Notebook = { version: 1; plots: SavedPlot[] };
const text = (value: unknown, max: number) =>
  typeof value === "string" && value.length <= max;
const isoDate = (value: unknown) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(value).toISOString().slice(0, 10) === value;

export function parseNotebook(raw: string): Notebook {
  const data = JSON.parse(raw) as Notebook;
  if (
    data?.version !== 1 ||
    !Array.isArray(data.plots) ||
    data.plots.length > 50
  )
    throw new Error("Use a TerraProof notebook v1 containing up to 50 plots.");
  const ids = new Set<string>();
  for (const plot of data.plots) {
    const b = plot.bounds;
    if (
      !text(plot.id, 80) ||
      ids.has(plot.id) ||
      !text(plot.name, 80) ||
      !plot.name.trim() ||
      !["0-5cm", "5-15cm", "15-30cm"].includes(plot.depth) ||
      !b ||
      Object.keys(b).length !== 4 ||
      Object.values(b).some(
        (value) => typeof value !== "number" || !Number.isFinite(value),
      ) ||
      ![b.west, b.east, b.south, b.north].every(Number.isFinite) ||
      b.west < -180 ||
      b.east > 180 ||
      b.south < -85 ||
      b.north > 85 ||
      b.west >= b.east ||
      b.south >= b.north ||
      b.east - b.west > 30 ||
      b.north - b.south > 30 ||
      !Array.isArray(plot.seasons) ||
      plot.seasons.length > 200 ||
      !Array.isArray(plot.samples) ||
      plot.samples.length > 200
    )
      throw new Error(
        "This notebook contains an invalid plot or too many records.",
      );
    ids.add(plot.id);
    for (const row of plot.seasons)
      if (
        !text(row.id, 80) ||
        !text(row.crop, 80) ||
        !row.crop.trim() ||
        !isoDate(row.plantingDate) ||
        !text(row.notes, 1000)
      )
        throw new Error("This notebook contains an invalid planting record.");
    for (const row of plot.samples)
      if (
        !text(row.id, 80) ||
        !isoDate(row.sampleDate) ||
        !text(row.depth, 40) ||
        !row.depth.trim() ||
        !text(row.laboratory, 120) ||
        !row.laboratory.trim() ||
        typeof row.phWater !== "number" ||
        !Number.isFinite(row.phWater) ||
        row.phWater < 0 ||
        row.phWater > 14
      )
        throw new Error(
          "This notebook contains an invalid pH-in-water record.",
        );
  }
  return data;
}

export function sameBounds(a: Bounds, b: Bounds) {
  return (
    a.west === b.west &&
    a.east === b.east &&
    a.south === b.south &&
    a.north === b.north
  );
}
