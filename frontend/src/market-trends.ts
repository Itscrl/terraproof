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
    primaryBuyers: "Local Palay Traders, Commercial Rice Mills & NFA Procurement",
    marketInsight:
      "Strongest liquidity in local markets; harvesting during July–September lean months often commands a farmgate price premium.",
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
    primaryBuyers: "Regional Feed Mills, Livestock Integrators & Grain Consolidators",
    marketInsight:
      "Consistent commercial absorption from feed processors; lower water requirement than paddy rice makes it a resilient dry-transition cash crop.",
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
    primaryBuyers: "Soy Food Processors (Tofu/Taho/Soymilk), Feed Mills & Seed Multipliers",
    marketInsight:
      "High price per kg and lower nitrogen fertilizer cost due to root nodulation; ideal rotation partner after rice or maize.",
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
    primaryBuyers: "Specialty Feed Compounders, Artisan Grain Buyers & Bio-Energy Aggregators",
    marketInsight:
      "Low input cost and strong tolerance to dry spells; confirm local feed-mill contract buyers before planting at scale.",
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
    primaryBuyers: "Wholesale Vegetable Trading Posts, Supermarkets & Fast-Food Processors",
    marketInsight:
      "Highest gross revenue potential per hectare, but strictly requires cooler highland temperatures (15–25 °C) and clean seed tubers.",
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
    leanMonths: [6, 7, 8, 9],
    peakHarvestMonths: [2, 3, 4],
    primaryBuyers: "Specialty Flour Mills & Regional Agronomy Trial Programs",
    marketInsight:
      "Requires cool seasonal windows (15–23 °C); generally outside tropical lowland temperature ranges unless grown in cool elevated zones.",
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
    primaryBuyers: "Local Public Markets, Peanut Butter/Snack Processors & Seed Traders",
    marketInsight:
      "Commands high farmgate prices with modest fertilizer needs; thrives in well-drained sandy-loam soils and warm seasons.",
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
      ? "Lean Supply Window (+12% Price Trend)"
      : isPeak
        ? "Peak Harvest Window (High Volume)"
        : "Balanced Market Window";

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
        ? "Top Market & Climate Pick"
        : tier === "strong_option"
          ? "Viable Market Alternative"
          : tier === "conditional"
            ? "Needs Local Soil/Weather Check"
            : "Outside Regional Climate Range";

    const harvestWindowLabel = `${MONTHS[harvestMonth - 1]?.slice(0, 3) ?? "—"}–${MONTHS[harvestEndMonth - 1]?.slice(0, 3) ?? "—"}`;

    const rationale =
      tier === "top_pick"
        ? `${crop.name} aligns with regional soil pH (${crop.soil_ph?.toFixed(1) ?? "—"}) and ${matching}/${crop.climate.complete_seasons} past NASA seasons, targeting a ${marketTimingBadge.toLowerCase()} with ~₱${netReturnPhpHa.toLocaleString("en-US")}/ha estimated net return.`
        : tier === "strong_option"
          ? `${crop.name} offers ${profile.demandTrend.toLowerCase()} (~₱${netReturnPhpHa.toLocaleString("en-US")}/ha net), though local variety and water management should be reviewed.`
          : `${crop.name} has strong market value (₱${adjustedPricePhpKg}/kg), but regional temperature or soil pH falls outside its primary reference window.`;

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
