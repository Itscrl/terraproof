import type { CropScreen } from "./planting-types";
import { MONTHS } from "./PlantingGuide";

export type MarketCropProfile = {
  id: string;
  marketCategory: string;
  demandTrend: string;
  demandGrowthPct: number;
  pricePhpKg: [number, number];
  defaultPricePhpKg: number;
  yieldTHa: [number, number];
  defaultYieldTHa: number;
  costsPhpHa: {
    seeds: number;
    fertilizer: number;
    labor: number;
    irrigation: number;
    other: number;
  };
  leanMonths: number[];
  peakHarvestMonths: number[];
  primaryBuyers: string;
  marketInsight: string;
};

export const MARKET_PROFILES: Record<string, MarketCropProfile> = {
  rice_indica: {
    id: "rice_indica",
    marketCategory: "Staple Food Grain",
    demandTrend: "High Year-Round Staple Demand",
    demandGrowthPct: 4.2,
    pricePhpKg: [19, 26],
    defaultPricePhpKg: 22.5,
    yieldTHa: [3.8, 5.4],
    defaultYieldTHa: 4.5,
    costsPhpHa: {
      seeds: 4500,
      fertilizer: 14500,
      labor: 22000,
      irrigation: 4500,
      other: 3500,
    },
    leanMonths: [7, 8, 9],
    peakHarvestMonths: [3, 4, 10, 11],
    primaryBuyers: "Local Rice Mills & Palay Traders",
    marketInsight:
      "Easy to sell locally year-round, with higher buyer prices during July–September.",
  },
  maize: {
    id: "maize",
    marketCategory: "Feed & Food Cereal",
    demandTrend: "Rising Poultry & Livestock Feed Demand",
    demandGrowthPct: 6.8,
    pricePhpKg: [17, 24],
    defaultPricePhpKg: 20.5,
    yieldTHa: [4.2, 6.5],
    defaultYieldTHa: 5.2,
    costsPhpHa: {
      seeds: 6800,
      fertilizer: 15500,
      labor: 18500,
      irrigation: 3000,
      other: 3200,
    },
    leanMonths: [1, 2, 6, 7],
    peakHarvestMonths: [3, 4, 8, 9],
    primaryBuyers: "Regional Feed Mills & Grain Buyers",
    marketInsight:
      "Steady demand from poultry and feed mills; needs less water than paddy rice.",
  },
  soybean: {
    id: "soybean",
    marketCategory: "Protein Legume & Oilseed",
    demandTrend: "High Import-Substitution Growth",
    demandGrowthPct: 9.4,
    pricePhpKg: [34, 48],
    defaultPricePhpKg: 40.0,
    yieldTHa: [1.8, 2.8],
    defaultYieldTHa: 2.3,
    costsPhpHa: {
      seeds: 5200,
      fertilizer: 8500,
      labor: 16000,
      irrigation: 2500,
      other: 2800,
    },
    leanMonths: [5, 6, 7, 8, 9, 10],
    peakHarvestMonths: [1, 2, 3],
    primaryBuyers: "Soy Food Makers (Taho/Tofu) & Feed Mills",
    marketInsight:
      "Great selling price and naturally enriches soil fertility after rice or corn.",
  },
  sorghum: {
    id: "sorghum",
    marketCategory: "Drought-Tolerant Feed & Grain",
    demandTrend: "Emerging Climate-Resilient Feed Trend",
    demandGrowthPct: 5.5,
    pricePhpKg: [16, 22],
    defaultPricePhpKg: 19.0,
    yieldTHa: [3.2, 5.0],
    defaultYieldTHa: 4.0,
    costsPhpHa: {
      seeds: 3800,
      fertilizer: 10500,
      labor: 15000,
      irrigation: 2000,
      other: 2500,
    },
    leanMonths: [6, 7, 8, 11],
    peakHarvestMonths: [2, 3, 4],
    primaryBuyers: "Feed Compounders & Grain Buyers",
    marketInsight:
      "Handles dry weather well with low farming costs; line up a local feed buyer first.",
  },
  potato: {
    id: "potato",
    marketCategory: "High-Value Cash Tuber",
    demandTrend: "Premium Foodservice & Fresh Retail Demand",
    demandGrowthPct: 8.1,
    pricePhpKg: [42, 68],
    defaultPricePhpKg: 52.0,
    yieldTHa: [12.0, 20.0],
    defaultYieldTHa: 15.0,
    costsPhpHa: {
      seeds: 65000,
      fertilizer: 28000,
      labor: 42000,
      irrigation: 8500,
      other: 9500,
    },
    leanMonths: [8, 9, 10, 11],
    peakHarvestMonths: [1, 2, 3, 4],
    primaryBuyers: "Vegetable Markets & Food Processors",
    marketInsight:
      "High market value, but needs cool highland air and well-drained soil.",
  },
  wheat: {
    id: "wheat",
    marketCategory: "Cool-Season Cereal",
    demandTrend: "Specialty Milling & Trial Demand",
    demandGrowthPct: 3.1,
    pricePhpKg: [20, 28],
    defaultPricePhpKg: 24.0,
    yieldTHa: [2.2, 3.6],
    defaultYieldTHa: 2.8,
    costsPhpHa: {
      seeds: 5500,
      fertilizer: 12000,
      labor: 15500,
      irrigation: 3000,
      other: 2500,
    },
    primaryBuyers: "Specialty Flour Mills & Trial Programs",
    leanMonths: [6, 7, 8, 9],
    peakHarvestMonths: [2, 3, 4],
    marketInsight:
      "Needs cool, dry mountain weather; too warm for most tropical lowlands.",
  },
  groundnut: {
    id: "groundnut",
    marketCategory: "High-Value Oilseed & Snack Legume",
    demandTrend: "Strong Confectionery & Local Market Demand",
    demandGrowthPct: 7.6,
    pricePhpKg: [48, 72],
    defaultPricePhpKg: 58.0,
    yieldTHa: [1.6, 2.6],
    defaultYieldTHa: 2.1,
    costsPhpHa: {
      seeds: 9500,
      fertilizer: 8000,
      labor: 21000,
      irrigation: 2500,
      other: 3500,
    },
    leanMonths: [7, 8, 9, 10],
    peakHarvestMonths: [2, 3, 4],
    primaryBuyers: "Public Markets & Peanut Snack Makers",
    marketInsight:
      "Fetches strong prices in local markets and thrives in loose, well-drained soil.",
  },
};

export type MarketTrendSuggestion = {
  crop: CropScreen;
  profile: MarketCropProfile;
  trendScore: number;
  tier: "top_pick" | "strong_option" | "conditional" | "caution";
  tierLabel: string;
  harvestWindowLabel: string;
  marketTimingBadge: string;
  marketTimingMultiplier: number;
  adjustedPricePhpKg: number;
  estimatedYieldTHa: number;
  totalCostPhpHa: number;
  grossRevenuePhpHa: number;
  netReturnPhpHa: number;
  totalNetReturnPhp: number;
  roiPct: number;
  breakEvenYieldTHa: number;
  breakEvenPricePhpKg: number;
  seasonFitRatio: number;
  rationale: string;
};

export function analyzeMarketTrends(
  crops: CropScreen[],
  areaHa = 1.5,
  priceAdjustPct = 0,
): MarketTrendSuggestion[] {
  const safeArea = Math.max(0.1, Number.isFinite(areaHa) ? areaHa : 1);
  const suggestions = crops.map((crop) => {
    const profile = MARKET_PROFILES[crop.id] ?? MARKET_PROFILES.rice_indica;
    const harvestMonth = new Date(crop.indicative_harvest_window[0]).getUTCMonth() + 1;
    const harvestEndMonth = new Date(crop.indicative_harvest_window[1]).getUTCMonth() + 1;
    const isLean =
      profile.leanMonths.includes(harvestMonth) ||
      profile.leanMonths.includes(harvestEndMonth);
    const isPeak =
      profile.peakHarvestMonths.includes(harvestMonth) ||
      profile.peakHarvestMonths.includes(harvestEndMonth);

    const marketTimingMultiplier = isLean ? 1.12 : isPeak ? 0.96 : 1.02;
    const marketTimingBadge = isLean
      ? "Low Supply · Higher Buyer Price"
      : isPeak
        ? "Main Harvest · Fast Local Sales"
        : "Steady Buyer Demand";

    const adjustedPricePhpKg = Number(
      (
        profile.defaultPricePhpKg *
        marketTimingMultiplier *
        (1 + priceAdjustPct / 100)
      ).toFixed(2),
    );
    const estimatedYieldTHa = profile.defaultYieldTHa;
    const totalCostPhpHa =
      profile.costsPhpHa.seeds +
      profile.costsPhpHa.fertilizer +
      profile.costsPhpHa.labor +
      profile.costsPhpHa.irrigation +
      profile.costsPhpHa.other;
    const grossRevenuePhpHa = Math.round(
      estimatedYieldTHa * 1000 * adjustedPricePhpKg,
    );
    const netReturnPhpHa = grossRevenuePhpHa - totalCostPhpHa;
    const totalNetReturnPhp = Math.round(netReturnPhpHa * safeArea);
    const roiPct = Math.round((netReturnPhpHa / Math.max(1, totalCostPhpHa)) * 100);
    const breakEvenYieldTHa = Number(
      (totalCostPhpHa / Math.max(1, adjustedPricePhpKg * 1000)).toFixed(2),
    );
    const breakEvenPricePhpKg = Number(
      (totalCostPhpHa / Math.max(1, estimatedYieldTHa * 1000)).toFixed(2),
    );

    const complete = crop.climate.complete_seasons || 1;
    const matching = crop.climate.temperature_matching_seasons || 0;
    const seasonFitRatio = Math.round((matching / complete) * 100);

    const statusBase =
      crop.status === "reference_match"
        ? 55
        : crop.status === "local_review"
          ? 38
          : crop.status === "needs_data"
            ? 25
            : 12;
    const climateBonus = Math.round((matching / complete) * 25);
    const marketBonus = Math.min(20, Math.round(profile.demandGrowthPct * 1.5) + (isLean ? 6 : 2));
    const trendScore = Math.min(98, Math.max(15, statusBase + climateBonus + marketBonus));

    const tier: MarketTrendSuggestion["tier"] =
      crop.status === "reference_match" && seasonFitRatio >= 60
        ? "top_pick"
        : crop.status === "reference_match" || crop.status === "local_review"
          ? "strong_option"
          : crop.status === "needs_data"
            ? "conditional"
            : "caution";

    const tierLabel =
      tier === "top_pick"
        ? "Best Soil & Market Match"
        : tier === "strong_option"
          ? "Strong Cash Alternative"
          : tier === "conditional"
            ? "Check Local Water First"
            : "Better for Cooler Highlands";

    const harvestWindowLabel = `${MONTHS[harvestMonth - 1]?.slice(0, 3) ?? "—"}–${MONTHS[harvestEndMonth - 1]?.slice(0, 3) ?? "—"}`;

    const rationale =
      tier === "top_pick"
        ? `${crop.name} fits your soil balance and typical seasonal weather, harvesting in ${harvestWindowLabel} when buyer demand is strong.`
        : tier === "strong_option"
          ? `${crop.name} has steady local buyers and good profit potential if water is managed well.`
          : `${crop.name} sells well locally, but prefers cooler weather than typical lowland seasons.`;

    return {
      crop,
      profile,
      trendScore,
      tier,
      tierLabel,
      harvestWindowLabel,
      marketTimingBadge,
      marketTimingMultiplier,
      adjustedPricePhpKg,
      estimatedYieldTHa,
      totalCostPhpHa,
      grossRevenuePhpHa,
      netReturnPhpHa,
      totalNetReturnPhp,
      roiPct,
      breakEvenYieldTHa,
      breakEvenPricePhpKg,
      seasonFitRatio,
      rationale,
    };
  });

  return suggestions.sort((a, b) => b.trendScore - a.trendScore);
}

export type MonthlyPricePoint = {
  month: number;
  monthShort: string;
  pricePhpKg: number;
  supplyState: "lean" | "peak" | "balanced";
};

export function getMonthlyMarketPriceCurve(
  profile: MarketCropProfile,
  priceAdjustPct = 0,
): MonthlyPricePoint[] {
  return MONTHS.map((name, idx) => {
    const month = idx + 1;
    const isLean = profile.leanMonths.includes(month);
    const isPeak = profile.peakHarvestMonths.includes(month);
    const wave = Math.sin(((month - 1) / 12) * Math.PI * 2) * 0.03;
    const mult = (isLean ? 1.13 : isPeak ? 0.94 : 1.01) + wave;
    const pricePhpKg = Number(
      (profile.defaultPricePhpKg * mult * (1 + priceAdjustPct / 100)).toFixed(2),
    );
    return {
      month,
      monthShort: name.slice(0, 3),
      pricePhpKg,
      supplyState: isLean ? "lean" : isPeak ? "peak" : "balanced",
    };
  });
}

const CROP_NAMES: Record<string, string> = {
  rice_indica: "Rice (indica)",
  maize: "Maize (grain)",
  soybean: "Soybean",
  groundnut: "Groundnut (peanut)",
  sorghum: "Sorghum",
  potato: "Potato",
  wheat: "Wheat",
};

export function buildBaselineMarketTrends(
  areaHa = 1.5,
  plantingMonth = 11,
  planningYear = 2027,
  priceAdjustPct = 0,
  soilPh = 5.6,
): MarketTrendSuggestion[] {
  const keys = [
    "rice_indica",
    "maize",
    "soybean",
    "groundnut",
    "sorghum",
    "potato",
    "wheat",
  ];
  const syntheticCrops: CropScreen[] = keys.map((id, idx) => {
    const profile = MARKET_PROFILES[id];
    const startMonth = ((plantingMonth + 2) % 12) + 1;
    const endMonth = ((plantingMonth + 3) % 12) + 1;
    const fitSeasons = idx < 3 ? 9 : idx < 5 ? 8 : 3;
    return {
      id,
      name: CROP_NAMES[id] ?? id,
      species: "",
      family: profile.marketCategory,
      status:
        idx < 3
          ? "reference_match"
          : idx < 5
            ? "local_review"
            : "outside_reference",
      checks: {
        ph: idx < 5 ? "within_reference" : "review",
        temperature: idx < 4 ? "within_reference" : "review",
      },
      soil_ph: soilPh,
      ph_spatial_range: [Number((soilPh - 0.3).toFixed(1)), Number((soilPh + 0.4).toFixed(1))],
      reference: {
        id,
        name: CROP_NAMES[id] ?? id,
        species: "",
        family: profile.marketCategory,
        source: "https://www.fao.org/4/s2022e/s2022e07.htm",
        temperature_c: { optimal: [21, 32], absolute: [12, 38] },
        ph: { optimal: [5.2, 6.8], absolute: [4.5, 8.0] },
        indicative_days: [105, 135],
        indicative_water_mm: [450, 750],
        local_checks: "Confirm local cultivar, drainage, and buyer price.",
      },
      climate: {
        reference_days: 120,
        complete_seasons: 10,
        excluded_years: [],
        temperature_c: { median: 27.1, min: 25.6, max: 28.4 },
        rainfall_mm: { median: 680, min: 430, max: 960 },
        longest_dry_run_days: { median: 6, min: 3, max: 11 },
        temperature_matching_seasons: fitSeasons,
        root_wetness: { median: 0.64, min: 0.48, max: 0.82 },
      },
      planting_reference: `${planningYear}-${String(plantingMonth).padStart(2, "0")}-01`,
      indicative_harvest_window: [
        `${planningYear}-${String(startMonth).padStart(2, "0")}-01`,
        `${planningYear}-${String(endMonth).padStart(2, "0")}-15`,
      ],
      needs_checking: [
        "Verify plant-available N-P-K and local buyer contract pricing.",
      ],
    };
  });

  return analyzeMarketTrends(syntheticCrops, areaHa, priceAdjustPct);
}
