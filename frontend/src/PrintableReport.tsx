import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Award,
  Bot,
  Check,
  CheckCircle2,
  Compass,
  LayoutTemplate,
  MapPin,
  Moon,
  Printer,
  Repeat,
  Send,
  Sparkles,
  Sprout,
  Sun,
  TrendingUp,
  Wand2,
  X,
} from "lucide-react";
import { downloadJSON } from "./api";
import type { Bounds, SoilReport } from "./soil-types";
import type { PlantingReport } from "./planting-types";
import {
  MONTHS,
  ROTATION_OPTIONS,
  type RotationFollowCropId,
} from "./PlantingGuide";
import {
  analyzeMarketTrends,
  buildBaselineMarketTrends,
  getMonthlyMarketPriceCurve,
} from "./market-trends";
import {
  BrandIcon,
  CropIllustration,
  MarketStoryChart,
  SoilHorizonIllustration,
} from "./LandingGraphics";
import {
  describeCarbonInWords,
  describeClayInWords,
  describeDepthInWords,
  describeLocationBanner,
  describePhInWords,
  describeReturnInWords,
  describeWetnessInWords,
} from "./plain-language";

export type PrintDesign = "executive" | "field_poster" | "certificate";
export type PrintTheme = "forest" | "harvest" | "ocean" | "ink";
export type AudienceMode = "standard" | "farmer" | "bank_loan" | "buyer_pitch";

const DESIGN_META: Record<PrintDesign, { name: string; tag: string }> = {
  executive: { name: "Story Brief", tag: "Editorial" },
  field_poster: { name: "Field Poster", tag: "High-Contrast" },
  certificate: { name: "Advisor Ledger", tag: "Formal" },
};

const THEME_META: Record<PrintTheme, { label: string; swatch: string }> = {
  forest: { label: "Forest", swatch: "#15803D" },
  harvest: { label: "Harvest", swatch: "#A16207" },
  ocean: { label: "Ocean", swatch: "#0369A1" },
  ink: { label: "Ink", swatch: "#1E293B" },
};

const DEFAULT_RAIN = [
  180, 140, 120, 110, 165, 230, 280, 260, 275, 310, 340, 290,
];

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  appliedTags?: string[];
};

const QUICK_PROMPTS = [
  {
    label: "Bank / Agri-Loan Brief",
    prompt:
      "Customize this print for an agricultural bank loan officer with cost breakdown and repayment metrics.",
  },
  {
    label: "Simple Farmer Poster",
    prompt:
      "Make it a high-contrast Farmer Field Poster focused on practical planting steps and harvest timing.",
  },
  {
    label: "Buyer Offtake Pitch",
    prompt:
      "Tailor for a commercial crop buyer highlighting harvest volume and lean-supply window.",
  },
  {
    label: "Show Expense Guide",
    prompt: "Add the farming expense breakdown to the print.",
  },
  {
    label: "Show Seasonal Chart",
    prompt: "Include the seasonal price and rainfall chart on the sheet.",
  },
  {
    label: "Ultra-Minimalist",
    prompt:
      "Make the print ultra-minimalist with only the core story and highlights.",
  },
];

export default function PrintableReport({
  bounds,
  depth,
  areaHa,
  placeLabel,
  soilReport,
  plantingReport,
  plantingMonth,
  planningYear,
  selectedRotation = "soybean",
  selectedPrimaryCropId,
  colorMode = "light",
  onToggleColorMode,
  onBackToMarket,
  onReturnToLanding,
  onRequestAssess,
  busy,
}: {
  bounds: Bounds;
  depth: string;
  areaHa: number;
  placeLabel?: string;
  soilReport?: SoilReport;
  plantingReport?: PlantingReport;
  plantingMonth: number;
  planningYear: number;
  selectedRotation?: RotationFollowCropId;
  selectedPrimaryCropId?: string;
  colorMode?: "light" | "dark";
  onToggleColorMode?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onBackToMarket?: () => void;
  onReturnToLanding?: () => void;
  onRequestAssess: () => void;
  busy: boolean;
}) {
  const [design, setDesign] = useState<PrintDesign>("executive");
  const [theme, setTheme] = useState<PrintTheme>("forest");
  const [audience, setAudience] = useState<AudienceMode>("standard");
  const [farmName, setFarmName] = useState("Albay Family Farm Guide");
  const [activeCropIdx, setActiveCropIdx] = useState(0);
  const priceAdjustPct = 0;
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [showTrendChart, setShowTrendChart] = useState(false);
  const [rotationCropId, setRotationCropId] =
    useState<RotationFollowCropId>(selectedRotation);
  const [ultraMinimal, setUltraMinimal] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! Tell me who this print is for (farmers, a bank loan officer, or a crop buyer) or what to show (expense guide, seasonal chart, or ultra-simple view), and I’ll update the page live.",
      appliedTags: ["Story Brief", "Forest Theme"],
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const phProp = soilReport?.properties.find((p) => p.id === "phh2o");
  const socProp = soilReport?.properties.find((p) => p.id === "soc");
  const clayProp = soilReport?.properties.find((p) => p.id === "clay");
  const lastWetness = soilReport?.wetness.daily?.at(-1);

  const soilPhVal = phProp?.median ?? 5.6;
  const socVal = socProp?.median ?? 18.4;
  const clayVal = clayProp?.median ?? 28.0;

  const phWords = describePhInWords(soilPhVal);
  const carbonWords = describeCarbonInWords(socVal);
  const clayWords = describeClayInWords(clayVal);
  const wetnessWords = describeWetnessInWords(lastWetness?.GWETROOT);
  const locationBanner = describeLocationBanner(
    bounds,
    areaHa,
    depth,
    placeLabel,
  );
  const depthWords = describeDepthInWords(depth);

  const marketSuggestions = plantingReport
    ? analyzeMarketTrends(plantingReport.crops, areaHa, priceAdjustPct)
    : buildBaselineMarketTrends(
        areaHa,
        plantingMonth,
        planningYear,
        priceAdjustPct,
        soilPhVal,
      );

  const topThree = marketSuggestions.slice(0, 3);
  const matchedIdx = selectedPrimaryCropId
    ? topThree.findIndex((c) => c.crop.id === selectedPrimaryCropId)
    : -1;
  const effectiveIdx =
    activeCropIdx === 0 && matchedIdx > 0 ? matchedIdx : activeCropIdx;
  const featured = topThree[effectiveIdx] ?? topThree[0];
  const featuredReturnWords = describeReturnInWords(
    featured.roiPct,
    featured.tier,
  );

  const activeRotation =
    ROTATION_OPTIONS.find((r) => r.id === rotationCropId) ??
    ROTATION_OPTIONS[0];

  const monthlyRainfall =
    plantingReport?.history.monthly.map((m) => m.rainfall_mm.median ?? 150) ??
    DEFAULT_RAIN;

  const harvestMonths = [
    new Date(featured.crop.indicative_harvest_window[0]).getUTCMonth() + 1,
    new Date(featured.crop.indicative_harvest_window[1]).getUTCMonth() + 1,
  ];

  const priceCurve = getMonthlyMarketPriceCurve(
    featured.profile,
    priceAdjustPct,
  );

  const phPercent = Math.min(
    96,
    Math.max(6, ((soilPhVal - 4.0) / (8.5 - 4.0)) * 100),
  );

  function applyAiPrompt(rawPrompt: string) {
    const q = rawPrompt.trim();
    if (!q) return;

    const lower = q.toLowerCase();
    const applied: string[] = [];
    let reply = "";

    if (
      lower.includes("bank") ||
      lower.includes("loan") ||
      lower.includes("credit") ||
      lower.includes("financ")
    ) {
      setAudience("bank_loan");
      setDesign("certificate");
      setTheme("ink");
      setShowCostBreakdown(true);
      setUltraMinimal(false);
      applied.push("Advisor Ledger", "Bank Loan Focus", "Expense Guide");
      reply =
        "Formatted for an Agri-Bank Loan: switched to the formal Advisor Ledger and added the farming expense guide.";
    } else if (
      lower.includes("farmer") ||
      lower.includes("poster") ||
      lower.includes("worker") ||
      lower.includes("field guide") ||
      lower.includes("simple")
    ) {
      setAudience("farmer");
      setDesign("field_poster");
      setTheme("forest");
      setShowCostBreakdown(false);
      setUltraMinimal(false);
      applied.push("Field Poster", "Simple Farmer Guide");
      reply =
        "Switched to a high-contrast Farmer Field Poster with simple planting, soil, and harvest steps.";
    } else if (
      lower.includes("buyer") ||
      lower.includes("offtake") ||
      lower.includes("trader") ||
      lower.includes("commercial") ||
      lower.includes("pitch")
    ) {
      setAudience("buyer_pitch");
      setDesign("executive");
      setTheme("harvest");
      setShowTrendChart(true);
      setUltraMinimal(false);
      applied.push("Story Brief", "Buyer Pitch", "Harvest Theme");
      reply = `Tailored for Local Crop Buyers: highlighted your ${featured.harvestWindowLabel} harvest window and steady supply.`;
    }

    if (
      lower.includes("ultra") ||
      lower.includes("minimal") ||
      lower.includes("short") ||
      lower.includes("clean")
    ) {
      setUltraMinimal(true);
      setShowCostBreakdown(false);
      setShowTrendChart(false);
      setDesign("executive");
      applied.push("Ultra-Minimalist Mode");
      if (!reply) {
        reply =
          "Simplified the page to just the main summary, crop pictures, and two-season plan.";
      }
    } else if (
      lower.includes("full") ||
      lower.includes("everything") ||
      lower.includes("detailed")
    ) {
      setUltraMinimal(false);
      setShowCostBreakdown(true);
      setShowTrendChart(true);
      applied.push("Full View", "Expense Guide", "Seasonal Chart");
      if (!reply) {
        reply =
          "Expanded all sections, including the farming expense guide and seasonal market chart.";
      }
    }

    if (
      lower.includes("cost") ||
      lower.includes("budget") ||
      lower.includes("expense") ||
      lower.includes("roi")
    ) {
      setShowCostBreakdown(true);
      if (!applied.includes("Expense Guide")) applied.push("Expense Guide");
      if (!reply) {
        reply = `Added the farming expense guide for ${featured.crop.name} (Seeds, Soil Food, Field Help, and Water Care).`;
      }
    }

    if (
      lower.includes("chart") ||
      lower.includes("curve") ||
      lower.includes("seasonal") ||
      lower.includes("trajectory")
    ) {
      setShowTrendChart((v) => !v);
      applied.push("Seasonal Chart");
      if (!reply) {
        reply = `Added the seasonal rain and buyer demand chart for ${featured.crop.name}.`;
      }
    }

    if (lower.includes("groundnut") || lower.includes("peanut")) {
      setRotationCropId("groundnut");
      applied.push("Rotation: Groundnut");
      if (!reply) {
        reply = "Updated the second-season crop to Groundnut (Peanut).";
      }
    } else if (lower.includes("soybean")) {
      setRotationCropId("soybean");
      applied.push("Rotation: Soybean");
    }

    topThree.forEach((item, idx) => {
      const firstWord = item.crop.name.split(" ")[0].toLowerCase();
      if (lower.includes(firstWord)) {
        setActiveCropIdx(idx);
        applied.push(`Focus: ${item.crop.name}`);
        if (!reply) {
          reply = `Switched the featured crop story and illustrations to ${item.crop.name}.`;
        }
      }
    });

    if (lower.includes("harvest") || lower.includes("gold")) {
      setTheme("harvest");
      applied.push("Harvest Gold");
    } else if (
      lower.includes("ocean") ||
      lower.includes("blue") ||
      lower.includes("teal")
    ) {
      setTheme("ocean");
      applied.push("Ocean Teal");
    } else if (
      lower.includes("ink") ||
      lower.includes("dark") ||
      lower.includes("black")
    ) {
      setTheme("ink");
      applied.push("Classic Ink");
    } else if (lower.includes("forest") || lower.includes("green")) {
      setTheme("forest");
      applied.push("Emerald Forest");
    }

    const noteMatch = q.match(/(?:note|add|directive|remind)\s*:\s*(.+)/i);
    if (noteMatch?.[1]) {
      setCustomNote(noteMatch[1].trim());
      applied.push("Custom Farm Note");
      reply = `Added your custom note onto the printable guide: "${noteMatch[1].trim()}".`;
    }

    if (!reply) {
      setCustomNote(q);
      applied.push("Custom Farm Note");
      reply = `Added your note directly onto the ${DESIGN_META[design].name}.`;
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: q,
    };
    const botMsg: ChatMessage = {
      id: `b-${Date.now() + 1}`,
      role: "assistant",
      text: reply,
      appliedTags: applied,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setChatInput("");
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 60);
  }

  return (
    <div className="minimal-result-wrap">
      {/* SINGLE UNIFIED TOP STUDIO BAR (Consistent with Step 2, plain-word location beside Light Mode) */}
      <div className="minimal-studio-toolbar unified-result-bar no-print">
        <div className="minimal-toolbar-group">
          {onReturnToLanding && (
            <button
              type="button"
              className="topbar-back-btn"
              onClick={onReturnToLanding}
              title="Return to Landing Page"
            >
              <BrandIcon size={22} />
              <span>Landing Page</span>
            </button>
          )}
          {onBackToMarket && (
            <button
              type="button"
              className="topbar-back-btn"
              onClick={onBackToMarket}
            >
              <ArrowLeft size={15} aria-hidden="true" />
              <span>2. Crops &amp; Market</span>
            </button>
          )}
        </div>

        <div className="minimal-toolbar-group">
          <span className="toolbar-label">Style</span>
          <div
            className="minimal-design-pills"
            role="radiogroup"
            aria-label="Report design style"
          >
            {(Object.keys(DESIGN_META) as PrintDesign[]).map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={design === key}
                className={`minimal-pill-btn ${design === key ? "is-active" : ""}`}
                onClick={() => setDesign(key)}
              >
                {key === "executive" ? (
                  <LayoutTemplate size={14} aria-hidden="true" />
                ) : key === "field_poster" ? (
                  <Sprout size={14} aria-hidden="true" />
                ) : (
                  <Award size={14} aria-hidden="true" />
                )}
                <span>{DESIGN_META[key].name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="minimal-toolbar-group">
          <span className="toolbar-label">Color</span>
          <div
            className="minimal-theme-dots"
            role="group"
            aria-label="Color accent"
          >
            {(Object.keys(THEME_META) as PrintTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={theme === t}
                title={THEME_META[t].label}
                className={`minimal-swatch-btn ${theme === t ? "is-active" : ""}`}
                onClick={() => setTheme(t)}
              >
                <span style={{ background: THEME_META[t].swatch }} />
                <small>{THEME_META[t].label}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="minimal-toolbar-actions">
          <div className="region-context-chip">
            <MapPin size={14} aria-hidden="true" />
            <span>{locationBanner}</span>
          </div>

          {onToggleColorMode && (
            <button
              type="button"
              className="theme-mode-toggle"
              onClick={onToggleColorMode}
              aria-label={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
            >
              {colorMode === "dark" ? (
                <Sun size={15} aria-hidden="true" />
              ) : (
                <Moon size={15} aria-hidden="true" />
              )}
            </button>
          )}
          {(!soilReport || !plantingReport) && (
            <button
              type="button"
              className="minimal-ghost-btn"
              disabled={busy}
              onClick={onRequestAssess}
            >
              <Compass size={15} aria-hidden="true" />
              <span>{busy ? "Updating…" : "Refresh"}</span>
            </button>
          )}
          <button
            type="button"
            className="minimal-ghost-btn"
            onClick={() =>
              downloadJSON(
                {
                  farmName,
                  audience,
                  bounds,
                  soilReport,
                  plantingReport,
                  marketSuggestions: topThree,
                },
                "terraproof-decision-brief.json",
              )
            }
          >
            <ArrowDownToLine size={15} aria-hidden="true" />
            <span>Save File</span>
          </button>
          <button
            type="button"
            className={`minimal-ghost-btn ${copilotOpen ? "is-active-ai-btn" : ""}`}
            onClick={() => setCopilotOpen((o) => !o)}
          >
            <Bot size={15} aria-hidden="true" />
            <span>{copilotOpen ? "Hide AI" : "AI Customizer"}</span>
          </button>
          <button
            type="button"
            className="minimal-print-cta"
            onClick={() => window.print()}
          >
            <Printer size={16} aria-hidden="true" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* FULL-WIDTH MINIMALIST PRINTABLE SHEET + FLOATING AI BUBBLE */}
      <div className="print-studio-single-stage">
        <article
          id="custom-printable-sheet"
          className={`printable-sheet minimal-story-sheet design-${design} theme-${theme}`}
          aria-label="Minimalist farm and market story report"
        >
          {/* TOP META, CROP PICTURE HERO & EDITABLE PARCEL TITLE */}
          <header className="story-sheet-header">
            <div className="story-brand-row">
              <span className="story-kicker">
                <Sparkles size={13} aria-hidden="true" /> TERRAPROOF{" "}
                {audience === "bank_loan"
                  ? "FARM LOAN & PROFIT SUMMARY"
                  : audience === "farmer"
                    ? "SIMPLE FIELD PLANTING GUIDE"
                    : audience === "buyer_pitch"
                      ? "HARVEST & BUYER SUPPLY SHEET"
                      : `VISUAL FARM STORY · ${DESIGN_META[design].name.toUpperCase()}`}
              </span>
              <span className="story-coords-pill">
                <MapPin size={13} aria-hidden="true" />
                {locationBanner}
              </span>
            </div>

            <div className="story-hero-verdict-row">
              <CropIllustration
                cropId={featured.crop.id}
                size={84}
                className="story-hero-crop-pic"
              />
              <div className="story-hero-verdict-copy">
                <input
                  type="text"
                  className="story-title-input"
                  value={farmName}
                  aria-label="Editable farm or parcel title"
                  onChange={(e) => setFarmName(e.target.value)}
                />

                {/* SHORT, PLAIN-LANGUAGE VERDICT (Zero Jargon) */}
                <p className="story-verdict-lead">
                  {audience === "bank_loan" ? (
                    <>
                      Your land has <strong>{phWords.title.toLowerCase()}</strong>{" "}
                      and <strong>{carbonWords.title.toLowerCase()}</strong>.
                      Planting <strong>{featured.crop.name}</strong> in{" "}
                      <strong>{MONTHS[plantingMonth - 1]}</strong> fits reliable
                      seasonal weather and targets a{" "}
                      <strong className="verdict-accent">
                        {featuredReturnWords.headline.toLowerCase()}
                      </strong>{" "}
                      in <strong>{featured.harvestWindowLabel}</strong>.
                    </>
                  ) : audience === "buyer_pitch" ? (
                    <>
                      Planting <strong>{featured.crop.name}</strong> in{" "}
                      <strong>{MONTHS[plantingMonth - 1]}</strong> prepares a
                      fresh harvest in{" "}
                      <strong>{featured.harvestWindowLabel}</strong> when local
                      buyer demand is strong, backed by{" "}
                      <strong>{phWords.title.toLowerCase()}</strong>.
                    </>
                  ) : (
                    <>
                      Your field has{" "}
                      <strong>{phWords.title.toLowerCase()}</strong> and{" "}
                      <strong>{wetnessWords.title.toLowerCase()}</strong>.
                      Planting <strong>{featured.crop.name}</strong> in{" "}
                      <strong>{MONTHS[plantingMonth - 1]}</strong> matches your
                      local weather and harvests in{" "}
                      <strong>{featured.harvestWindowLabel}</strong> for a{" "}
                      <strong className="verdict-accent">
                        {featuredReturnWords.headline.toLowerCase()}
                      </strong>
                      .
                    </>
                  )}
                </p>
              </div>
            </div>

            {customNote && (
              <div className="ai-custom-directive-banner">
                <Wand2 size={15} aria-hidden="true" />
                <div>
                  <strong>Custom Farm Note:</strong> <span>{customNote}</span>
                </div>
              </div>
            )}
          </header>

          {/* 3 MINIMALIST HERO HIGHLIGHTS IN PLAIN WORDS */}
          <section
            className="story-highlights-strip"
            aria-label="Three primary decision highlights"
          >
            <div className="story-highlight-card is-primary-highlight">
              <span className="highlight-step-tag">01 · BEST CROP MATCH</span>
              <strong>{featured.crop.name}</strong>
              <p>
                {featured.tierLabel} · Harvests in {featured.harvestWindowLabel}
              </p>
            </div>

            <div className="story-highlight-card">
              <span className="highlight-step-tag">02 · MARKET OUTLOOK</span>
              <strong>{featuredReturnWords.headline}</strong>
              <p>{featuredReturnWords.subline}</p>
            </div>

            <div className="story-highlight-card">
              <span className="highlight-step-tag">03 · NEXT-SEASON CROP</span>
              <strong>+ {activeRotation.name}</strong>
              <p>{activeRotation.benefitLabel} after first harvest</p>
            </div>
          </section>

          {/* CHAPTERS GRID: VISUAL CROP PORTFOLIO + ILLUSTRATED SOIL HORIZON */}
          <div
            className={`story-chapters-grid ${ultraMinimal ? "is-ultra-minimal" : ""}`}
          >
            {/* CHAPTER 1: VISUAL CROP RECOMMENDATIONS & SEASONAL WINDOWS */}
            <section
              className="story-chapter-card market-chapter"
              aria-label="Recommended crops with visual pictures and market windows"
            >
              <div className="chapter-head">
                <div>
                  <span className="chapter-num">
                    CHAPTER 01 · RECOMMENDED CROPS
                  </span>
                  <h3>
                    Best Crops to Plant in {MONTHS[plantingMonth - 1]}
                  </h3>
                </div>
                <button
                  type="button"
                  className="toggle-chart-pill no-print"
                  onClick={() => setShowTrendChart((v) => !v)}
                >
                  <TrendingUp size={13} aria-hidden="true" />
                  <span>
                    {showTrendChart
                      ? "Hide Seasonal Chart"
                      : "Show Seasonal Chart"}
                  </span>
                </button>
              </div>

              <p className="chapter-narrative">
                {featured.profile.marketInsight} Best sold to{" "}
                <strong>{featured.profile.primaryBuyers.toLowerCase()}</strong>.
              </p>

              {/* VISUAL CROP GALLERY CARDS */}
              <div
                className="story-crop-gallery-grid"
                role="radiogroup"
                aria-label="Top 3 recommended crops with illustrations"
              >
                {topThree.map((item, idx) => {
                  const isSelected = item.crop.id === featured.crop.id;
                  const itemWords = describeReturnInWords(
                    item.roiPct,
                    item.tier,
                  );
                  return (
                    <button
                      key={item.crop.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`story-crop-visual-card ${isSelected ? "is-active-crop" : ""}`}
                      onClick={() => setActiveCropIdx(idx)}
                    >
                      <div className="story-crop-card-head">
                        <CropIllustration cropId={item.crop.id} size={54} />
                        <div>
                          <span className="crop-rank-tag">
                            {idx === 0 ? "Top Pick" : `Option ${idx + 1}`}
                          </span>
                          <strong>{item.crop.name}</strong>
                          <small>Harvests {item.harvestWindowLabel}</small>
                        </div>
                      </div>
                      <div className="story-crop-card-metrics">
                        <div>
                          <span>Market Outlook</span>
                          <strong>{itemWords.headline}</strong>
                        </div>
                        <div>
                          <span>Buyer Timing</span>
                          <strong>{item.marketTimingBadge.split("·")[0]}</strong>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* TWO-SEASON VISUAL ROTATION PAIRING */}
              {!ultraMinimal && (
                <div className="story-rotation-visual-banner">
                  <div className="rotation-banner-head">
                    <span className="chapter-num">
                      <Repeat size={11} aria-hidden="true" /> TWO-SEASON CROP
                      PLAN
                    </span>
                    <div className="rotation-mini-switcher no-print">
                      {ROTATION_OPTIONS.map((rot) => (
                        <button
                          key={rot.id}
                          type="button"
                          className={rotationCropId === rot.id ? "active" : ""}
                          onClick={() => setRotationCropId(rot.id)}
                        >
                          + {rot.name.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rotation-visual-flow">
                    <div className="rot-stage-node">
                      <CropIllustration cropId={featured.crop.id} size={48} />
                      <div>
                        <small>
                          First Crop ({MONTHS[plantingMonth - 1].slice(0, 3)})
                        </small>
                        <strong>{featured.crop.name}</strong>
                        <span>Main Cash Harvest</span>
                      </div>
                    </div>

                    <ArrowRight
                      size={18}
                      className="rot-flow-arrow"
                      aria-hidden="true"
                    />

                    <div className="rot-stage-node">
                      <CropIllustration cropId={activeRotation.id} size={48} />
                      <div>
                        <small>Next-Season Partner</small>
                        <strong>{activeRotation.name}</strong>
                        <span>{activeRotation.benefitLabel}</span>
                      </div>
                    </div>
                  </div>

                  <p className="rotation-banner-caption">
                    {activeRotation.summary(
                      featured.crop.name,
                      featured.harvestWindowLabel,
                    )}
                  </p>
                </div>
              )}

              {/* OPTIONAL SEASONAL TRAJECTORY CHART */}
              {showTrendChart && (
                <div className="story-chart-frame">
                  <div className="story-chart-legend">
                    <span>
                      <i className="legend-dot gold" /> Buyer Demand Trend
                    </span>
                    <span>
                      <i className="legend-dot green" /> Typical Monthly Rain
                    </span>
                  </div>
                  <MarketStoryChart
                    cropName={featured.crop.name}
                    points={priceCurve}
                    monthlyRainfall={monthlyRainfall}
                    plantingMonth={plantingMonth}
                    harvestMonths={harvestMonths}
                  />
                </div>
              )}

              {/* AI-ENABLED FARM EXPENSE GUIDE */}
              {showCostBreakdown && (
                <div className="ai-cost-breakdown-box">
                  <div className="cost-box-head">
                    <strong>
                      Typical Farming Expense Guide ({featured.crop.name})
                    </strong>
                    <span>Main Farm Inputs</span>
                  </div>
                  <div className="cost-pills-grid">
                    <div>
                      <span>Seeds &amp; Starts</span>
                      <strong>Standard Seed Share</strong>
                    </div>
                    <div>
                      <span>Soil Food</span>
                      <strong>Moderate Fertilizer</strong>
                    </div>
                    <div>
                      <span>Field Help</span>
                      <strong>Planting &amp; Harvest Care</strong>
                    </div>
                    <div>
                      <span>Water Care</span>
                      <strong>Canal &amp; Drainage</strong>
                    </div>
                    <div className="cost-net-cell">
                      <span>Return Outlook</span>
                      <strong>{featuredReturnWords.headline}</strong>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* CHAPTER 2 & 3 SIDE COLUMN WITH SOIL GRAPHIC */}
            {!ultraMinimal && (
              <div className="story-side-column">
                <section
                  className="story-chapter-card soil-chapter"
                  aria-label="Soil health story with visual graphic"
                >
                  <span className="chapter-num">
                    CHAPTER 02 · SOIL HEALTH ({depthWords.toUpperCase()})
                  </span>
                  <h3>How Your Ground Supports Roots</h3>
                  <p className="chapter-narrative">
                    Your soil has{" "}
                    <strong>{phWords.title.toLowerCase()}</strong> and{" "}
                    <strong>{clayWords.title.toLowerCase()}</strong> —{" "}
                    {phWords.summary.toLowerCase()}
                  </p>

                  {/* ILLUSTRATED SOIL HORIZON & ROOT GRAPHIC */}
                  <SoilHorizonIllustration
                    balanceLabel={phWords.title}
                    fertilityLabel={carbonWords.title}
                    moistureLabel={wetnessWords.title}
                  />

                  <div className="ph-spectrum-box">
                    <div className="ph-spectrum-labels">
                      <span>Sour Soil</span>
                      <strong>Your Soil: {phWords.title}</strong>
                      <span>Alkaline</span>
                    </div>
                    <div className="ph-spectrum-track">
                      <div className="ph-optimal-band" />
                      <div
                        className="ph-marker-pin"
                        style={{ left: `${phPercent}%` }}
                      />
                    </div>
                    <small>
                      Green zone shows where plant roots absorb food best
                    </small>
                  </div>

                  <div className="soil-mini-kpis">
                    <div>
                      <span>Soil Fertility</span>
                      <strong>{carbonWords.title}</strong>
                    </div>
                    <div>
                      <span>Soil Feel</span>
                      <strong>{clayWords.title}</strong>
                    </div>
                    <div>
                      <span>Root Moisture</span>
                      <strong>{wetnessWords.title}</strong>
                    </div>
                  </div>
                </section>

                <section
                  className="story-chapter-card action-chapter"
                  aria-label="Three field action steps"
                >
                  <span className="chapter-num">CHAPTER 03 · ACTION PLAN</span>
                  <h3>3 Simple Steps Before Planting</h3>
                  <ol className="minimal-steps-list">
                    <li>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      <div>
                        <strong>1. Run a Quick Soil Kit Check</strong>
                        <span>
                          Check exact fertilizer bag needs with your local
                          agriculture office.
                        </span>
                      </div>
                    </li>
                    <li>
                      <TrendingUp size={16} aria-hidden="true" />
                      <div>
                        <strong>
                          2. Aim for the {featured.harvestWindowLabel} Harvest
                        </strong>
                        <span>
                          Confirm seed availability and buying prices with{" "}
                          {featured.profile.primaryBuyers.toLowerCase()}.
                        </span>
                      </div>
                    </li>
                    <li>
                      <Sprout size={16} aria-hidden="true" />
                      <div>
                        <strong>
                          3. Plant {activeRotation.name} Next Season
                        </strong>
                        <span>
                          Rest the field briefly, then plant{" "}
                          {activeRotation.name} to keep your soil rich.
                        </span>
                      </div>
                    </li>
                  </ol>
                </section>
              </div>
            )}
          </div>

          <footer className="story-sheet-footer">
            <span>
              <strong>TerraProof</strong> · Regional Soil, Weather &amp; Crop
              Market Guide
            </span>
            <span>Ready to share with your family &amp; farm adviser</span>
          </footer>
        </article>

        {/* FLOATING AI BUBBLE & POPOVER DOCK (Portaled to document.body so it is ALWAYS fixed on screen) */}
        {typeof document !== "undefined" &&
          createPortal(
            <div
              className={`copilot-floating-dock no-print ${colorMode === "dark" ? "dark-mode" : "light-mode"}`}
              data-theme={colorMode}
            >
              {copilotOpen && (
                <aside
                  id="ai-print-copilot-popover"
                  className="ai-print-copilot floating-popover animate-spring-in"
                  aria-label="AI Print Customizer Assistant"
                >
                  <div className="copilot-header">
                    <div className="copilot-brand">
                      <BrandIcon size={28} />
                      <div>
                        <strong>TerraProof Print AI</strong>
                        <span>Tailors your printable guide in plain words</span>
                      </div>
                    </div>
                    <div className="copilot-header-actions">
                      <span className="copilot-live-pill">
                        <Bot size={12} aria-hidden="true" /> Live
                      </span>
                      <button
                        type="button"
                        className="copilot-close-btn"
                        onClick={() => setCopilotOpen(false)}
                        aria-label="Minimize AI Print Customizer"
                        title="Minimize AI chat"
                      >
                        <X size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="copilot-quick-chips">
                    <span className="chips-kicker">
                      <Wand2 size={12} aria-hidden="true" /> Quick Customizations
                    </span>
                    <div className="chips-scroll-grid">
                      {QUICK_PROMPTS.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          className="copilot-chip-btn"
                          onClick={() => applyAiPrompt(item.prompt)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className="copilot-messages"
                    role="log"
                    aria-live="polite"
                  >
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`copilot-bubble bubble-${msg.role}`}
                      >
                        <p>{msg.text}</p>
                        {msg.appliedTags && msg.appliedTags.length > 0 && (
                          <div className="applied-tags-row">
                            {msg.appliedTags.map((t) => (
                              <span key={t} className="applied-tag-pill">
                                <Check size={11} aria-hidden="true" /> {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <form
                    className="copilot-input-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      applyAiPrompt(chatInput);
                    }}
                  >
                    <input
                      type="text"
                      value={chatInput}
                      placeholder="Ask AI: 'Simple farmer poster', 'Focus on Maize', 'Add note: add compost'…"
                      aria-label="Ask AI to customize the print output"
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="copilot-send-btn"
                      disabled={!chatInput.trim()}
                      aria-label="Apply AI print customization"
                    >
                      <Send size={15} aria-hidden="true" />
                    </button>
                  </form>
                </aside>
              )}

              {/* CLICKABLE FLOATING AI BUBBLE (FAB) */}
              <button
                type="button"
                className={`copilot-fab-bubble ${copilotOpen ? "is-open" : ""}`}
                aria-expanded={copilotOpen}
                aria-controls="ai-print-copilot-popover"
                onClick={() => setCopilotOpen((o) => !o)}
              >
                <span className="fab-pulse-ring" aria-hidden="true" />
                <BrandIcon size={34} />
                <div className="fab-bubble-copy">
                  <strong>
                    {copilotOpen ? "Minimize Print AI" : "AI Print Customizer"}
                  </strong>
                  <span>
                    {copilotOpen
                      ? "Tap to collapse bubble"
                      : "Tap to customize style, crops & notes"}
                  </span>
                </div>
                <Sparkles
                  size={16}
                  className="fab-sparkle-icon"
                  aria-hidden="true"
                />
              </button>
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
