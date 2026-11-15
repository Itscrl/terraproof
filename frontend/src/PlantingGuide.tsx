import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  CloudRain,
  CloudSun,
  Coins,
  Droplets,
  Repeat,
  Sparkles,
  Sun,
  TrendingUp,
} from "lucide-react";
import { api } from "./api";
import type { SoilRequest } from "./soil-types";
import type {
  CropScreen,
  PlantingReport,
  PlantingRequest,
} from "./planting-types";
import {
  analyzeMarketTrends,
  buildBaselineMarketTrends,
  getMonthlyMarketPriceCurve,
} from "./market-trends";
import {
  CropIllustration,
  MarketStoryChart,
  SeasonWeatherGraphic,
} from "./LandingGraphics";
import {
  describePhInWords,
  describeRainfallInWords,
  describeReturnInWords,
  describeTempInWords,
} from "./plain-language";
import { springScrollToY } from "./spring-scroll";

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DEFAULT_RAIN = [
  180, 140, 120, 110, 165, 230, 280, 260, 275, 310, 340, 290,
];
const DEFAULT_TEMP = [
  25.8, 26.1, 26.9, 27.8, 28.3, 28.0, 27.5, 27.6, 27.4, 27.1, 26.6, 26.0,
];

type MarketSubStep = 1 | 2 | 3;

export type RotationFollowCropId = "soybean" | "groundnut" | "maize";

export const ROTATION_OPTIONS: {
  id: RotationFollowCropId;
  name: string;
  badge: string;
  benefitLabel: string;
  bonusPhpHa: number;
  summary: (primaryName: string, harvestWindow: string) => string;
}[] = [
  {
    id: "soybean",
    name: "Soybean",
    badge: "Recommended Soil Builder",
    benefitLabel: "Restores Soil + Extra Cash",
    bonusPhpHa: 54000,
    summary: (primaryName, harvestWindow) =>
      `Plant Soybean after your ${harvestWindow} ${primaryName} harvest to naturally feed the soil and cut fertilizer costs.`,
  },
  {
    id: "groundnut",
    name: "Groundnut (Peanut)",
    badge: "High-Value Dry Season Crop",
    benefitLabel: "Strong Market Price",
    bonusPhpHa: 66000,
    summary: () =>
      `Thrives in drier months on well-drained soil and sells fast to local public markets and snack makers.`,
  },
  {
    id: "maize",
    name: "Yellow Maize (Corn)",
    badge: "Steady Feed Mill Demand",
    benefitLabel: "Fast Grain Sale",
    bonusPhpHa: 49500,
    summary: () =>
      `Pairs two dependable grain harvests for food and poultry feed buyers when water is available.`,
  },
];

export default function PlantingGuide({
  region,
  areaHa = 1.5,
  soilPh = 5.6,
  initialReport,
  selectedRotation = "soybean",
  onSelectRotation,
  onSelectPrimaryCrop,
  onReportChange,
  onFinishToResult,
}: {
  region: SoilRequest;
  stale?: boolean;
  areaHa?: number;
  soilPh?: number;
  initialReport?: PlantingReport;
  selectedRotation?: RotationFollowCropId;
  onSelectRotation?: (cropId: RotationFollowCropId) => void;
  onSelectPrimaryCrop?: (cropId: string) => void;
  onReportChange?: (
    report: PlantingReport,
    month: number,
    year: number,
  ) => void;
  onFinishToResult?: () => void;
}) {
  const [subStep, setSubStep] = useState<MarketSubStep>(1);
  const [month, setMonth] = useState(
    initialReport?.request.planting_month ?? new Date().getUTCMonth() + 1,
  );
  const [year] = useState(
    initialReport?.request.planning_year ?? new Date().getUTCFullYear() + 1,
  );
  const [water, setWater] =
    useState<PlantingRequest["water_supply"]>("rainfed");
  const [priority, setPriority] =
    useState<PlantingRequest["priority"]>("reference_fit");
  const [priceAdjustPct, setPriceAdjustPct] = useState(0);
  const [selectedCropId, setSelectedCropId] = useState<string>("rice_indica");
  const [rotationChoice, setRotationChoice] =
    useState<RotationFollowCropId>(selectedRotation);
  const [checkedSteps, setCheckedSteps] = useState<[boolean, boolean, boolean]>([
    true,
    false,
    false,
  ]);
  const [data, setData] = useState<PlantingReport | undefined>(initialReport);
  const [busy, setBusy] = useState(false);

  async function run(
    nextMonth = month,
    nextWater = water,
    nextPriority = priority,
  ) {
    setBusy(true);
    try {
      const req: PlantingRequest = {
        ...region,
        planting_month: nextMonth,
        planning_year: year,
        water_supply: nextWater,
        priority: nextPriority,
      };
      const res = await api<PlantingReport>("/planting/assess", req);
      setData(res);
      onReportChange?.(res, nextMonth, year);
    } catch {
      /* Fallback baseline remains active */
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!data && !busy) {
      void run();
    }
  }, []);

  function goSubStep(next: MarketSubStep) {
    setSubStep(next);
    springScrollToY(0, { stiffness: 170, damping: 20 });
  }

  function handlePickCrop(cropId: string) {
    setSelectedCropId(cropId);
    onSelectPrimaryCrop?.(cropId);
  }

  function handlePickRotation(rotId: RotationFollowCropId) {
    setRotationChoice(rotId);
    onSelectRotation?.(rotId);
  }

  function toggleCheckStep(index: 0 | 1 | 2) {
    setCheckedSteps((prev) => {
      const next: [boolean, boolean, boolean] = [...prev] as [
        boolean,
        boolean,
        boolean,
      ];
      next[index] = !next[index];
      return next;
    });
  }

  const monthlyRainfall =
    data?.history.monthly.map((m) => m.rainfall_mm.median ?? 150) ??
    DEFAULT_RAIN;
  const monthlyTemp =
    data?.history.monthly.map((m) => m.temperature_c.median ?? 27.0) ??
    DEFAULT_TEMP;
  const maxRain = Math.max(1, ...monthlyRainfall);

  const marketSuggestions = data
    ? analyzeMarketTrends(data.crops, areaHa, priceAdjustPct)
    : buildBaselineMarketTrends(areaHa, month, year, priceAdjustPct, soilPh);

  const topFour = marketSuggestions.slice(0, 4);
  const activeMarketItem =
    topFour.find((m) => m.crop.id === selectedCropId) ?? topFour[0];

  const activeHarvestMonths = [
    new Date(activeMarketItem.crop.indicative_harvest_window[0]).getUTCMonth() +
      1,
    new Date(activeMarketItem.crop.indicative_harvest_window[1]).getUTCMonth() +
      1,
  ];

  const priceCurve = getMonthlyMarketPriceCurve(
    activeMarketItem.profile,
    priceAdjustPct,
  );

  const selectedMonthRain = monthlyRainfall[month - 1] ?? 180;
  const selectedMonthTemp = monthlyTemp[month - 1] ?? 27.0;
  const rainWords = describeRainfallInWords(selectedMonthRain);
  const tempWords = describeTempInWords(selectedMonthTemp);
  const phWords = describePhInWords(soilPh);
  const activeReturnWords = describeReturnInWords(
    activeMarketItem.roiPct,
    activeMarketItem.tier,
  );
  const verifiedCount = checkedSteps.filter(Boolean).length;

  return (
    <section
      className="planting-guide market-wizard-shell"
      id="planting-guide"
      aria-labelledby="planting-title"
    >
      {/* STEP-BY-STEP MARKET WIZARD HEADER & PROGRESS PILLS */}
      <div className="market-wizard-header">
        <div>
          <span className="biophilic-eyebrow">
            <TrendingUp size={13} aria-hidden="true" /> STEP-BY-STEP CROP &amp;
            MARKET GUIDE
          </span>
          <h2 id="planting-title">
            {subStep === 1 && "1. Pick Your Planting Month & Water Setup"}
            {subStep === 2 && "2. Compare Crop Pictures & Buyer Demand"}
            {subStep === 3 && "3. Choose Next-Season Crop & Quick Checks"}
          </h2>
        </div>

        <nav
          className="market-substep-tabs"
          aria-label="Market analysis steps"
        >
          <button
            type="button"
            className={`substep-tab ${subStep === 1 ? "is-active" : subStep > 1 ? "is-done" : ""}`}
            onClick={() => goSubStep(1)}
          >
            <span className="substep-badge">
              {subStep > 1 ? <Check size={12} aria-hidden="true" /> : "1"}
            </span>
            <span>Season &amp; Water</span>
          </button>

          <button
            type="button"
            className={`substep-tab ${subStep === 2 ? "is-active" : subStep > 2 ? "is-done" : ""}`}
            onClick={() => goSubStep(2)}
          >
            <span className="substep-badge">
              {subStep > 2 ? <Check size={12} aria-hidden="true" /> : "2"}
            </span>
            <span>Crops &amp; Market</span>
          </button>

          <button
            type="button"
            className={`substep-tab ${subStep === 3 ? "is-active" : ""}`}
            onClick={() => goSubStep(3)}
          >
            <span className="substep-badge">3</span>
            <span>Rotation &amp; Checks</span>
          </button>
        </nav>
      </div>

      {/* ===================================================================
          SUBSTEP 1: SEASON & WATER SETUP (Plain-Word Month Grid + Graphics)
         =================================================================== */}
      {subStep === 1 && (
        <div key="substep-1" className="market-wizard-stage animate-spring-in">
          <div className="substep-1-grid">
            <div className="season-picker-card">
              <div className="card-mini-head">
                <strong>When do you want to plant?</strong>
                <span>Green bars show typical rain for each month</span>
              </div>

              <div
                className="month-calendar-grid"
                role="radiogroup"
                aria-label="Select planting month"
              >
                {MONTHS.map((name, idx) => {
                  const mNum = idx + 1;
                  const rain = monthlyRainfall[idx] ?? 150;
                  const barPct = Math.max(
                    14,
                    Math.round((rain / maxRain) * 100),
                  );
                  const active = month === mNum;
                  const shortRainWord =
                    rain >= 240 ? "Rainy" : rain >= 150 ? "Balanced" : "Sunny";
                  return (
                    <button
                      key={name}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`month-Visual-pill ${active ? "is-selected" : ""}`}
                      onClick={() => {
                        setMonth(mNum);
                        void run(mNum, water, priority);
                      }}
                    >
                      <div className="month-pill-top">
                        <strong>{name.slice(0, 3)}</strong>
                        <span
                          className={`month-weather-icon weather-${shortRainWord.toLowerCase()}`}
                          title={`${shortRainWord} season`}
                          aria-label={`${shortRainWord} season`}
                        >
                          {shortRainWord === "Rainy" ? (
                            <CloudRain size={15} aria-hidden="true" />
                          ) : shortRainWord === "Balanced" ? (
                            <CloudSun size={15} aria-hidden="true" />
                          ) : (
                            <Sun size={15} aria-hidden="true" />
                          )}
                        </span>
                      </div>
                      <div className="month-mini-bar-track">
                        <span style={{ width: `${barPct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="water-priority-row">
                <div className="pill-option-group">
                  <span className="option-group-label">
                    <Droplets size={13} aria-hidden="true" /> How is your field
                    watered?
                  </span>
                  <div className="segmented-choice-pills">
                    {(
                      [
                        ["rainfed", "Rain Only"],
                        ["irrigation", "Canal / Pump"],
                        ["unknown", "Not Sure"],
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={water === val ? "active" : ""}
                        onClick={() => {
                          setWater(val);
                          void run(month, val, priority);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pill-option-group">
                  <span className="option-group-label">
                    <Sparkles size={13} aria-hidden="true" /> What matters most?
                  </span>
                  <div className="segmented-choice-pills">
                    {(
                      [
                        ["reference_fit", "Best Profit"],
                        ["shorter_season", "Fast Harvest"],
                        ["legume_options", "Soil-Building Beans"],
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={priority === val ? "active" : ""}
                        onClick={() => {
                          setPriority(val);
                          void run(month, water, val);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Visual Season Weather Graphic + Best Crop Match */}
            <aside className="season-story-preview">
              <div className="season-preview-hero-row">
                <CropIllustration
                  cropId={activeMarketItem.crop.id}
                  size={68}
                />
                <div>
                  <span className="spotlight-tag">
                    {MONTHS[month - 1].toUpperCase()} SEASON OUTLOOK
                  </span>
                  <h3>
                    Plant in <strong>{MONTHS[month - 1]}</strong>, harvest in{" "}
                    <strong>{activeMarketItem.harvestWindowLabel}</strong>
                  </h3>
                </div>
              </div>

              <SeasonWeatherGraphic
                rainMm={selectedMonthRain}
                monthName={MONTHS[month - 1]}
                cropName={activeMarketItem.crop.name}
              />

              <p>
                {MONTHS[month - 1]} brings{" "}
                <strong>{rainWords.label.toLowerCase()}</strong> and{" "}
                <strong>{tempWords.toLowerCase()}</strong> — making{" "}
                <strong>{activeMarketItem.crop.name}</strong> your strongest
                match.
              </p>

              <div className="snapshot-kpis">
                <div>
                  <span>Typical Weather</span>
                  <strong>{rainWords.label}</strong>
                </div>
                <div>
                  <span>Air Warmth</span>
                  <strong>{tempWords}</strong>
                </div>
                <div>
                  <span>Soil Balance</span>
                  <strong>{phWords.title}</strong>
                </div>
                <div>
                  <span>Best Crop Match</span>
                  <strong>{activeMarketItem.crop.name}</strong>
                </div>
              </div>

              <button
                type="button"
                className="wizard-primary-next"
                onClick={() => goSubStep(2)}
              >
                <span>
                  {busy
                    ? "Updating crops… Next: Compare Crop Pictures"
                    : "Next: Compare Crop Pictures & Buyer Demand"}
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </aside>
          </div>
        </div>
      )}

      {/* ===================================================================
          SUBSTEP 2: CROP PICTURES & MARKET DEMAND STORY (Plain Language)
         =================================================================== */}
      {subStep === 2 && (
        <div key="substep-2" className="market-wizard-stage animate-spring-in">
          <div className="substep-2-dashboard">
            {/* Left: Interactive Illustrated Crop Cards */}
            <div className="wizard-crop-cards-col">
              <div className="col-head-inline">
                <strong>Best Crops for {MONTHS[month - 1]}</strong>
                <span>Tap any crop to see its harvest &amp; market story</span>
              </div>

              <div
                className="wizard-crop-stack"
                role="radiogroup"
                aria-label="Select crop to inspect market trend"
              >
                {topFour.map((item, idx) => {
                  const isSelected =
                    item.crop.id === activeMarketItem.crop.id;
                  const returnWords = describeReturnInWords(
                    item.roiPct,
                    item.tier,
                  );
                  return (
                    <button
                      key={item.crop.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`wizard-crop-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => handlePickCrop(item.crop.id)}
                    >
                      <div className="wizard-crop-media-row">
                        <CropIllustration
                          cropId={item.crop.id}
                          size={54}
                        />
                        <div className="wizard-crop-body">
                          <div className="wizard-crop-top">
                            <span
                              className={`market-tier-badge badge-${item.tier}`}
                            >
                              {idx === 0 && (
                                <Award size={12} aria-hidden="true" />
                              )}{" "}
                              {item.crop.name}
                            </span>
                            <span className="wizard-return-pill">
                              {returnWords.headline}
                            </span>
                          </div>
                          <p className="wizard-crop-sub">
                            Harvests in{" "}
                            <strong>{item.harvestWindowLabel}</strong> ·{" "}
                            {item.marketTimingBadge}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Focused 12-Month Price & Rainfall Story Spotlight */}
            <div className="wizard-spotlight-col">
              <div className="spotlight-top-row">
                <div className="spotlight-crop-identity">
                  <CropIllustration
                    cropId={activeMarketItem.crop.id}
                    size={56}
                  />
                  <div>
                    <span className="spotlight-tag">
                      SEASONAL HARVEST &amp; BUYER DEMAND ·{" "}
                      {activeMarketItem.crop.name.toUpperCase()}
                    </span>
                    <h4>
                      {activeMarketItem.harvestWindowLabel}:{" "}
                      <span className="gold-highlight">
                        {activeMarketItem.marketTimingBadge}
                      </span>
                    </h4>
                  </div>
                </div>

                <label className="compact-price-slider">
                  <span>
                    <Coins size={13} aria-hidden="true" /> Market Mood:{" "}
                    <strong>
                      {priceAdjustPct > 0
                        ? "Higher Prices"
                        : priceAdjustPct < 0
                          ? "Cautious Prices"
                          : "Typical Market"}
                    </strong>
                  </span>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="10"
                    value={priceAdjustPct}
                    onChange={(e) => setPriceAdjustPct(Number(e.target.value))}
                  />
                </label>
              </div>

              <p className="spotlight-narrative">
                {activeMarketItem.rationale}
              </p>

              <div className="spotlight-chart-box">
                <MarketStoryChart
                  cropName={activeMarketItem.crop.name}
                  points={priceCurve}
                  monthlyRainfall={monthlyRainfall}
                  plantingMonth={month}
                  harvestMonths={activeHarvestMonths}
                />
              </div>

              <div className="spotlight-mini-stats">
                <div>
                  <span>Profit Outlook</span>
                  <strong>{activeReturnWords.headline}</strong>
                </div>
                <div>
                  <span>Harvest Window</span>
                  <strong>{activeMarketItem.harvestWindowLabel}</strong>
                </div>
                <div>
                  <span>Weather Reliability</span>
                  <strong>Strong Seasonal Fit</strong>
                </div>
                <div>
                  <span>Selling Ease</span>
                  <strong>Active Local Buyers</strong>
                </div>
              </div>

              <div className="market-buyers-foot">
                <CalendarClock size={14} aria-hidden="true" />
                <span>
                  <b>Where to Sell:</b>{" "}
                  {activeMarketItem.profile.primaryBuyers}
                </span>
              </div>
            </div>
          </div>

          <div className="wizard-step-footer">
            <button
              type="button"
              className="btn-secondary-outline"
              onClick={() => goSubStep(1)}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>1. Back to Season &amp; Water</span>
            </button>

            <button
              type="button"
              className="wizard-primary-next"
              onClick={() => goSubStep(3)}
            >
              <span>Next: Choose 2-Season Rotation &amp; Checks</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================
          SUBSTEP 3: INTERACTIVE 2-SEASON ROTATION & CLICKABLE FIELD CHECKS
         =================================================================== */}
      {subStep === 3 && (
        <div key="substep-3" className="market-wizard-stage animate-spring-in">
          <div className="substep-3-grid">
            <div className="rotation-story-card">
              <div className="card-mini-head">
                <span className="spotlight-tag">
                  <Repeat size={12} aria-hidden="true" /> TAP TO CHOOSE YOUR
                  SECOND-SEASON CROP
                </span>
                <h3>What Should Follow {activeMarketItem.crop.name}?</h3>
                <p>
                  Planting a bean or peanut crop after{" "}
                  {activeMarketItem.crop.name} keeps your soil fertile and gives
                  you a second harvest.
                </p>
              </div>

              <div
                className="rotation-sequence-cards"
                role="radiogroup"
                aria-label="Select second-season rotation crop"
              >
                {ROTATION_OPTIONS.map((rot) => {
                  const isChosen = rotationChoice === rot.id;
                  return (
                    <button
                      key={rot.id}
                      type="button"
                      role="radio"
                      aria-checked={isChosen}
                      className={`sequence-card interactive-seq-btn ${isChosen ? "is-recommended" : ""}`}
                      onClick={() => handlePickRotation(rot.id)}
                    >
                      <div className="seq-card-top">
                        <span className="seq-badge">{rot.badge}</span>
                        <span
                          className={`seq-select-indicator ${isChosen ? "selected" : ""}`}
                        >
                          {isChosen ? (
                            <>
                              <Check size={12} aria-hidden="true" /> Selected
                              for Report
                            </>
                          ) : (
                            "Tap to Select"
                          )}
                        </span>
                      </div>

                      <div className="seq-visual-pair">
                        <div className="seq-crop-chip">
                          <CropIllustration
                            cropId={activeMarketItem.crop.id}
                            size={44}
                          />
                          <div>
                            <small>First Crop</small>
                            <strong>{activeMarketItem.crop.name}</strong>
                          </div>
                        </div>

                        <ArrowRight
                          size={16}
                          className="seq-arrow-icon"
                          aria-hidden="true"
                        />

                        <div className="seq-crop-chip">
                          <CropIllustration cropId={rot.id} size={44} />
                          <div>
                            <small>Next Crop</small>
                            <strong>{rot.name}</strong>
                          </div>
                        </div>

                        <div className="seq-combined-return">
                          <small>Main Benefit</small>
                          <strong>{rot.benefitLabel}</strong>
                        </div>
                      </div>

                      <p>
                        {rot.summary(
                          activeMarketItem.crop.name,
                          activeMarketItem.harvestWindowLabel,
                        )}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="readiness-checks-card">
              <div className="checks-header-row">
                <div>
                  <span className="spotlight-tag">
                    INTERACTIVE FIELD CHECKLIST
                  </span>
                  <h3>3 Quick Checks Before Planting</h3>
                </div>
                <span className="verified-counter-pill">
                  {verifiedCount} of 3 Ready
                </span>
              </div>

              <p className="checks-helper-copy">
                Tap each item below as you check it on your farm:
              </p>

              <div
                className="wizard-checklist"
                role="group"
                aria-label="Pre-planting verification checklist"
              >
                <button
                  type="button"
                  aria-pressed={checkedSteps[0]}
                  className={`wizard-check-btn ${checkedSteps[0] ? "is-checked" : ""}`}
                  onClick={() => toggleCheckStep(0)}
                >
                  {checkedSteps[0] ? (
                    <CheckCircle2
                      size={18}
                      className="check-icon-done"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      size={18}
                      className="check-icon-idle"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <strong>1. Quick Soil Fertilizer Kit Test</strong>
                    <span>
                      Your soil has {phWords.title.toLowerCase()}, so a simple
                      local soil kit will tell you the exact fertilizer bag mix.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  aria-pressed={checkedSteps[1]}
                  className={`wizard-check-btn ${checkedSteps[1] ? "is-checked" : ""}`}
                  onClick={() => toggleCheckStep(1)}
                >
                  {checkedSteps[1] ? (
                    <CheckCircle2
                      size={18}
                      className="check-icon-done"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      size={18}
                      className="check-icon-idle"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <strong>2. Walk the Field &amp; Check Drainage</strong>
                    <span>
                      Make sure canals and field bunds are clear so heavy rain
                      does not flood young roots.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  aria-pressed={checkedSteps[2]}
                  className={`wizard-check-btn ${checkedSteps[2] ? "is-checked" : ""}`}
                  onClick={() => toggleCheckStep(2)}
                >
                  {checkedSteps[2] ? (
                    <CheckCircle2
                      size={18}
                      className="check-icon-done"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      size={18}
                      className="check-icon-idle"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <strong>3. Ask Local Buyers for Today’s Price</strong>
                    <span>
                      Confirm buying terms with{" "}
                      {activeMarketItem.profile.primaryBuyers.toLowerCase()}.
                    </span>
                  </div>
                </button>
              </div>

              <button
                type="button"
                className="mark-all-checks-btn"
                onClick={() =>
                  setCheckedSteps(
                    verifiedCount === 3
                      ? [false, false, false]
                      : [true, true, true],
                  )
                }
              >
                <Check size={14} aria-hidden="true" />
                <span>
                  {verifiedCount === 3
                    ? "Reset Checklist"
                    : "Mark All 3 Checks Ready"}
                </span>
              </button>

              {data && (
                <details className="compact-fao-drawer">
                  <summary>
                    See all {data.crops.length} crops with pictures
                  </summary>
                  <div className="compact-fao-list">
                    {data.crops.map((c: CropScreen) => (
                      <div key={c.id} className="compact-fao-row">
                        <div className="fao-row-crop">
                          <CropIllustration cropId={c.id} size={28} />
                          <strong>{c.name}</strong>
                        </div>
                        <span>
                          {c.status === "reference_match"
                            ? "Great Weather & Soil Fit"
                            : c.status === "local_review"
                              ? "Good With Local Care"
                              : "Better for Cooler Areas"}
                        </span>
                        <a
                          href={c.reference.source}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Guide <ArrowUpRight size={12} aria-hidden="true" />
                        </a>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </aside>
          </div>

          <div className="wizard-step-footer">
            <button
              type="button"
              className="btn-secondary-outline"
              onClick={() => goSubStep(2)}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>2. Back to Crops &amp; Market</span>
            </button>

            <button
              type="button"
              className="wizard-primary-next"
              onClick={() => onFinishToResult?.()}
            >
              <span>Finish: Open Final Result &amp; Print Story</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
