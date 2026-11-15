import { useState } from "react";
import { api, downloadJSON } from "./api";
import { MONTHS } from "./PlantingGuide";
import type { SoilRequest } from "./soil-types";
import type { CropScreen } from "./planting-types";

const CROPS = [
  ["rice_indica", "Rice (indica)"],
  ["maize", "Maize (grain)"],
  ["soybean", "Soybean"],
  ["sorghum", "Sorghum"],
  ["potato", "Potato"],
  ["wheat", "Wheat"],
  ["groundnut", "Groundnut / peanut"],
];
type Option = {
  id: string;
  label: string;
  sequence: string;
  status: string;
  baseline: boolean;
  seasons: CropScreen[];
  water_reference_mm: number[];
  water_note: string;
  soil_note: string;
  diversity_note: string;
  next_steps: string[];
};
type Report = {
  request: { water_supply: string; goal: string };
  options: Option[];
  method: { source: string; water: string; climate: string; sequence: string };
};
const show = (n: number | null) => (n == null ? "Not available" : n.toFixed(1));
function downloadPlan(report: Report) {
  const text = [
    "TerraProof — two-season crop comparison",
    "Early planning guide. Review with a local agricultural adviser.",
    `Water on your farm: ${report.request.water_supply === "rainfed" ? "mostly rainfall" : report.request.water_supply === "irrigation" ? "irrigation available (capacity not checked)" : "not yet confirmed"}.`,
    ...report.options.map((option) =>
      [
        option.label,
        option.sequence,
        option.status,
        ...option.seasons.map(
          (c) =>
            `${c.name}: planting ${c.planting_reference}; possible harvest ${c.indicative_harvest_window.join(" to ")}`,
        ),
        option.water_note,
        option.soil_note,
        option.diversity_note,
        "Before choosing:",
        ...option.next_steps,
        ...option.seasons.map((c) => c.reference.source),
      ].join("\n"),
    ),
    report.method.water,
    report.method.climate,
    report.method.sequence,
    report.method.source,
  ].join("\n\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "terraproof-crop-plans.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function RotationGuide({
  region,
  stale,
}: {
  region: SoilRequest;
  stale: boolean;
}) {
  const [first, setFirst] = useState("rice_indica");
  const [next, setNext] = useState("rice_indica");
  const [alt1, setAlt1] = useState("soybean");
  const [alt2, setAlt2] = useState("maize");
  const [month, setMonth] = useState(6);
  const [nextMonth, setNextMonth] = useState(12);
  const [goal, setGoal] = useState("water");
  const [water, setWater] = useState("unknown");
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const [report, setReport] = useState<Report | null>(null);
  const [snapshot, setSnapshot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const body = {
    ...region,
    first_crop: first,
    next_crop: next,
    alternatives: [alt1, alt2],
    planting_month: month,
    next_month: nextMonth,
    planning_year: year,
    goal,
    water_supply: water,
  };
  const changed =
    stale || (report !== null && snapshot !== JSON.stringify(body));
  const duplicate = new Set([next, alt1, alt2]).size !== 3;
  const cropSelect = (
    label: string,
    value: string,
    change: (v: string) => void,
  ) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => change(e.target.value)}
      >
        {CROPS.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
  const monthSelect = (
    label: string,
    value: number,
    change: (v: number) => void,
  ) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => change(Number(e.target.value))}
      >
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
  async function compare() {
    const sent = JSON.stringify(body);
    setBusy(true);
    setError("");
    try {
      const result = await api<Report>("/rotations/assess", body);
      setReport(result);
      setSnapshot(sent);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We could not read the evidence. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      id="rotation-guide"
      className="planting-guide rotation-guide"
      aria-labelledby="rotation-title"
    >
      <h2 id="rotation-title">Two-Season Crop Rotation & Sequence Planner</h2>
      <p>
        Compare your usual two-season sequence against two alternative next crops
        for soil, timing, and water fit.
      </p>
      <details className="guide-method">
        <summary>How to use the rotation planner</summary>
        <ol className="rotation-instructions">
          <li>
            <b>Tell us your usual plan.</b> Choose the first crop and what
            normally follows it.
          </li>
          <li>
            <b>Choose two ideas to compare.</b> Use crops you can get seeds for
            and sell or use at home.
          </li>
          <li>
            <b>Read each plan and its checks.</b> Download the comparison and
            discuss unresolved questions locally.
          </li>
        </ol>
      </details>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void compare();
        }}
      >
        <fieldset disabled={busy}>
          <legend>Your usual two-season plan</legend>
          <div className="rotation-fields">
            {cropSelect("First crop", first, setFirst)}
            {monthSelect("First crop planting month", month, setMonth)}
            <label>
              First planting year
              <input
                type="number"
                min="2026"
                max="2090"
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
            {cropSelect("Usual next crop", next, setNext)}
            {monthSelect("Next crop planting month", nextMonth, setNextMonth)}
            <label>
              Water available
              <select value={water} onChange={(e) => setWater(e.target.value)}>
                <option value="unknown">Not sure yet</option>
                <option value="rainfed">Mostly rainfall</option>
                <option value="irrigation">Irrigation is available</option>
              </select>
            </label>
          </div>
          <p>
            The next crop starts in {nextMonth <= month ? year + 1 : year}. We
            use the first day of each month for this early comparison. Confirm
            exact dates and time to prepare the land locally.
          </p>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Two alternatives for the next crop</legend>
          <div className="rotation-fields">
            {cropSelect("Alternative next crop 1", alt1, setAlt1)}
            {cropSelect("Alternative next crop 2", alt2, setAlt2)}
            <label>
              What matters most to you?
              <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                <option value="water">Understand water needs</option>
                <option value="diversity">Try a different crop group</option>
                <option value="familiar">Keep changes manageable</option>
              </select>
            </label>
          </div>
        </fieldset>
        {duplicate && (
          <p className="soil-error">
            Choose three different next crops so the plans are different.
          </p>
        )}
        {stale && (
          <p className="soil-stale">
            Your selected land changed. Assess the region above before comparing
            plans.
          </p>
        )}
        <button
          className="soil-assess"
          disabled={busy || stale || duplicate}
          type="submit"
        >
          {busy
            ? "Reading soil and past seasons…"
            : "Compare my three crop plans"}
        </button>
        <p>
          This is an early planning guide. It does not predict your harvest,
          income, soil improvement or the liters you need to irrigate.
        </p>
      </form>
      {busy && (
        <p role="status">
          We are checking soil acidity and past NASA weather for both planting
          months. This can take a minute. Your comparison will appear below.
        </p>
      )}
      {error && (
        <p className="soil-error" role="alert">
          {error} Your earlier comparison, if shown, has not been updated. Use
          “Compare my three crop plans” to retry.
        </p>
      )}
      {report && (
        <div className="rotation-results" aria-live="polite">
          <div className="soil-section-title">
            <h3>Your three crop plans</h3>
            <button
              disabled={changed}
              type="button"
              onClick={() => downloadPlan(report)}
            >
              Download comparison
            </button>
          </div>
          {changed && (
            <p className="soil-stale" role="status">
              Your choices changed. These results describe the earlier choices.
              Compare again before using or downloading them.
            </p>
          )}
          <p>
            <b>How to read the result:</b> “Worth exploring” means only soil
            acidity and average temperature fit the reference and the dates do
            not overlap. “Needs checking” means evidence is missing or
            borderline. “Potential conflict” means a reference or timing check
            found a problem. None means a guaranteed successful crop.
          </p>
          <p>
            {report.request.goal === "water"
              ? "Look first at the water-use explanation. A lower reference range does not prove you have enough irrigation."
              : report.request.goal === "diversity"
                ? "Look first at the crop-group and soil explanations. A different crop is not automatically better."
                : "Keep your usual plan as the starting point. Compare the extra seeds, work, equipment and buyers each change would require."}
          </p>
          <div className="rotation-options-grid">
          {report.options.map((option) => (
            <article className="rotation-option" key={option.id}>
              <h4>
                {option.label}: {option.sequence}
              </h4>
              <p className="rotation-status">
                <b>{option.status}</b>
              </p>
              <ol className="rotation-seasons">
                {option.seasons.map((crop, i) => (
                  <li key={i}>
                    <b>
                      {i === 0 ? "Grow first" : "Grow next"}: {crop.name}
                    </b>
                    <p>
                      Planting: {crop.planting_reference} · Harvest:{" "}
                      {crop.indicative_harvest_window.join(" to ")}
                    </p>
                    <p>
                      Soil pH: {show(crop.soil_ph)} (opt{" "}
                      {crop.reference.ph.optimal.join("–")}) · Temp:{" "}
                      {show(crop.climate.temperature_c.median)} °C (
                      {crop.climate.complete_seasons} seasons)
                    </p>
                  </li>
                ))}
              </ol>
              <p>
                <b>Water:</b> {option.water_note}
              </p>
              <p>
                <b>Diversity:</b> {option.diversity_note}
              </p>
              <p>
                <b>Soil:</b> {option.soil_note}
              </p>
              <details>
                <summary>Pre-planting checks & published sources</summary>
                <h5>Before choosing this plan</h5>
                <ul>
                  {option.next_steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                <p>
                  Both crops together: {option.water_reference_mm.join("–")} mm
                  of published crop water use. {report.method.water}
                </p>
                {option.seasons.map((crop, i) => (
                  <p key={i}>
                    <a
                      href={crop.reference.source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {crop.name} — FAO crop reference
                    </a>
                  </p>
                ))}
                <a href={report.method.source} target="_blank" rel="noreferrer">
                  FAO duration and water-use reference
                </a>
              </details>
            </article>
          ))}
          </div>
          <details className="guide-method">
            <summary>What this comparison can and cannot tell you</summary>
            <p>{report.method.climate}</p>
            <p>{report.method.sequence}</p>
            <p>
              Soil predictions and NASA weather describe a region, not
              measurements in each bed. Ask an adviser to check the land,
              available water and local growing practices. Try an affordable
              small trial before a large change.
            </p>
            <button
              type="button"
              disabled={changed}
              onClick={() =>
                downloadJSON(report, "terraproof-rotation-evidence.json")
              }
            >
              Download detailed evidence (JSON)
            </button>
          </details>
        </div>
      )}
    </section>
  );
}
