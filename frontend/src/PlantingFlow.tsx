import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Download,
  Save,
} from "lucide-react";
import { downloadJSON } from "./api";
import { Field, months, number, SeasonEvidence, YearChart } from "./components";
import type { Request, Result } from "./types";

const dateName = (month: number, day: number) => `${months[month - 1]} ${day}`;
export default function PlantingFlow({
  request,
  result,
  busy,
  dirty,
  update,
  compare,
  save,
  onCosts,
  initialStep,
  completedRuns,
}: {
  request: Request;
  result?: Result;
  busy: boolean;
  dirty: boolean;
  initialStep: number;
  completedRuns: number;
  update: (r: Request) => void;
  compare: () => Promise<boolean>;
  save: () => void;
  onCosts: () => void;
}) {
  const [step, setStep] = useState(initialStep);
  const [dateError, setDateError] = useState("");
  const [metric, setMetric] = useState<"heavy_rain_days" | "heat_days">(
    "heavy_rain_days",
  );
  const [year, setYear] = useState(2024);
  const [planIndex, setPlanIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (completedRuns > 0) setStep(2);
  }, [completedRuns]);
  const edit = (
    i: number,
    field: "planting_month" | "planting_day",
    value: number,
  ) => {
    setDateError("");
    update({
      ...request,
      plans: request.plans.map((p, j) =>
        i === j
          ? {
              ...p,
              [field]: value,
              name: `Date ${i + 1}: ${dateName(field === "planting_month" ? value : p.planting_month, field === "planting_day" ? value : p.planting_day)}`,
            }
          : p,
      ),
    });
  };
  const advance = async () => {
    const [first, second] = request.plans;
    if (
      first.planting_month === second.planting_month &&
      first.planting_day === second.planting_day
    ) {
      setDateError(
        "Both dates are the same. Choose a different month or day for your second date.",
      );
      return;
    }
    setDateError("");
    if (await compare()) {
      setYear(request.end_year);
      setStep(2);
    }
  };
  const names = (result?.request ?? request).plans.map((p) =>
    dateName(p.planting_month, p.planting_day),
  );
  const ready = result && result.common_complete_years.length > 0;
  const season = result?.plans[planIndex]?.seasons.find((s) => s.year === year);
  const delta = ready
    ? result.plans[0].average.heavy_rain_days! -
      result.plans[1].average.heavy_rain_days!
    : 0;
  return (
    <div className="planting-flow">
      <ol className="flow-progress" aria-label="Your progress">
        {["First date", "Another date", "Your comparison"].map((label, i) => (
          <li
            key={label}
            aria-current={step === i ? "step" : undefined}
            className={step === i ? "current" : step > i ? "complete" : ""}
          >
            <span>{step > i ? <Check size={15} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {step < 2 ? (
        <>
          <div className="flow-heading">
            <span className="flow-eyebrow">
              Step {step + 1} of 3 · Rice near Legazpi, Albay
            </span>
            <h1 ref={heading} tabIndex={-1}>
              {step === 0
                ? "When would you like to sow rice?"
                : "Which other date would you like to try?"}
            </h1>
            <p>
              {step === 0
                ? "Start with one date you are considering. We’ll help you compare it with another."
                : `Your first date is ${dateName(request.plans[0].planting_month, request.plans[0].planting_day)}. Pick a different date to compare.`}
            </p>
          </div>
          <form
            className="date-question"
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 0) setStep(1);
              else void advance();
            }}
          >
            <fieldset className="date-choice">
              <legend>
                <CalendarDays size={21} />
                {step === 0
                  ? "Your first sowing date"
                  : "Your second sowing date"}
              </legend>
              <div className="date-fields">
                <Field label="Month">
                  <select
                    value={request.plans[step].planting_month}
                    onChange={(e) =>
                      edit(step, "planting_month", +e.target.value)
                    }
                  >
                    {months.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Day">
                  <input
                    type="number"
                    required
                    min={1}
                    max={new Date(
                      2025,
                      request.plans[step].planting_month,
                      0,
                    ).getDate()}
                    value={request.plans[step].planting_day}
                    onChange={(e) =>
                      edit(step, "planting_day", +e.target.value)
                    }
                  />
                </Field>
              </div>
              <p className="field-explanation">
                The day you sow seeds, rather than the day you transplant
                seedlings.
              </p>
            </fieldset>
            {step === 0 ? (
              <p className="flow-helper">
                You can keep this example date or choose your own, then press
                Continue.
              </p>
            ) : (
              <div className="before-compare">
                <h2>What happens next?</h2>
                <p>
                  We’ll check past weather for both dates, using{" "}
                  {request.start_year}–{request.end_year}. You don’t need to
                  enter weather data.
                </p>
                <small>
                  The example crop takes{" "}
                  {request.plans[0].stages.reduce((a, s) => a + s.days, 0)} days
                  from sowing. You can change it below.
                </small>
              </div>
            )}
            {step === 1 && (
              <details className="flow-advanced">
                <summary>Change crop duration or past years (optional)</summary>
                <div className="plan-grid">
                  {request.plans.map((plan, i) => (
                    <fieldset key={i}>
                      <legend>
                        {dateName(plan.planting_month, plan.planting_day)}
                      </legend>
                      {plan.stages.map((stage, k) => (
                        <Field
                          key={stage.name}
                          label={`${["Leaf and stem growth", "Flowering", "Grain ripening"][k] ?? stage.name} (days)`}
                        >
                          <input
                            type="number"
                            min={1}
                            max={150}
                            required
                            value={stage.days}
                            onChange={(e) =>
                              update({
                                ...request,
                                plans: request.plans.map((p, j) =>
                                  i === j
                                    ? {
                                        ...p,
                                        stages: p.stages.map((s, n) =>
                                          n === k
                                            ? { ...s, days: +e.target.value }
                                            : s,
                                        ),
                                      }
                                    : p,
                                ),
                              })
                            }
                          />
                        </Field>
                      ))}
                    </fieldset>
                  ))}
                </div>
                <div className="input-pair">
                  <Field label="First year">
                    <input
                      type="number"
                      required
                      min={request.source === "bundled" ? 2015 : 1981}
                      max={2024}
                      value={request.start_year}
                      onChange={(e) =>
                        update({ ...request, start_year: +e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Last year">
                    <input
                      type="number"
                      required
                      min={request.start_year}
                      max={2024}
                      value={request.end_year}
                      onChange={(e) =>
                        update({ ...request, end_year: +e.target.value })
                      }
                    />
                  </Field>
                </div>
              </details>
            )}
            {dateError && step === 1 && (
              <p className="message error" role="alert">
                {dateError}
              </p>
            )}
            <div className="flow-actions">
              {step === 1 && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setStep(0)}
                >
                  <ArrowLeft size={17} />
                  Back
                </button>
              )}
              <button className="button primary" type="submit" disabled={busy}>
                {busy
                  ? "Checking past weather…"
                  : step === 0
                    ? "Continue"
                    : "Show my comparison"}
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
          <p className="flow-footnote">
            Past weather helps you prepare. It does not predict next season’s
            weather or harvest.
          </p>
        </>
      ) : (
        result && (
          <>
            <div className="flow-heading">
              <span className="flow-eyebrow">
                Step 3 of 3 · Your comparison
              </span>
              <h1 ref={heading} tabIndex={-1}>
                {names[0]} or {names[1]}?
              </h1>
              <p>
                Here’s what happened when we tried both dates in past years.
              </p>
            </div>
            {dirty ? (
              <div className="message pending" role="status">
                Your inputs have changed. Update the comparison before using
                these results.
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void advance()}
                >
                  Update comparison
                </button>
              </div>
            ) : (
              <>
                <div className="weather-takeaway">
                  <span className="data-badge">
                    Based on {result.common_complete_years.length} past years
                  </span>
                  <h2>
                    {!ready
                      ? "There isn’t enough weather data to compare these dates."
                      : Math.abs(delta) < 0.05
                        ? "Both dates had about the same number of heavy-rain days."
                        : `${delta < 0 ? names[0] : names[1]} had about ${number(Math.abs(delta))} fewer heavy-rain days per season.`}
                  </h2>
                  <p>
                    That does not guarantee a bigger harvest. Your variety,
                    water supply and care also matter.
                  </p>
                </div>
                <table className="simple-weather-table">
                  <caption>Average days in one growing season</caption>
                  <thead>
                    <tr>
                      <th scope="col">Weather</th>
                      {names.map((name, i) => (
                        <th scope="col" key={i}>
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["heavy_rain_days", "Heavy-rain days"],
                      ["heat_days", "Very hot days"],
                      ["longest_dry_spell_days", "Longest run of dry days"],
                    ].map(([key, label]) => (
                      <tr key={key}>
                        <th scope="row">{label}</th>
                        {result.plans.map((plan, i) => (
                          <td key={i}>{number(plan.average[key])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="weather-definitions">
                  Average days in one growing season. Heavy rain: 20 mm or more
                  in a day. Very hot: {result.request.heat_threshold_c} °C or
                  higher. Dry: less than 1 mm of rain.
                </p>
                <div className="next-step">
                  <div>
                    <h2>Want to check the costs?</h2>
                    <p>
                      Use your expected harvest, selling price and expenses to
                      estimate income.
                    </p>
                  </div>
                  <button className="button primary" onClick={onCosts}>
                    Estimate my income
                    <ArrowRight size={18} />
                  </button>
                </div>
              </>
            )}
            <div className="flow-secondary-actions">
              <button className="button secondary" onClick={() => setStep(0)}>
                <ArrowLeft size={16} />
                Change dates
              </button>
              <button
                className="text-button"
                disabled={busy || dirty}
                onClick={save}
              >
                <Save size={16} />
                Save comparison
              </button>
              <button
                className="text-button"
                disabled={busy || dirty}
                onClick={() =>
                  downloadJSON(result, "terraproof-comparison.json")
                }
              >
                <Download size={16} />
                Download results
              </button>
            </div>
            <details className="flow-details">
              <summary>See weather for each year</summary>
              <Field label="Weather to compare">
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as typeof metric)}
                >
                  <option value="heavy_rain_days">Heavy-rain days</option>
                  <option value="heat_days">Very hot days</option>
                </select>
              </Field>
              <div className="chart-legend">
                {names.map((name, i) => (
                  <span key={i}>
                    <i className={`swatch bar-${i}`} />
                    {name}
                  </span>
                ))}
              </div>
              <YearChart result={result} metric={metric} />
              <table>
                <thead>
                  <tr>
                    <th>Year</th>
                    {names.map((name, i) => (
                      <th key={i}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.plans[0].seasons.map((s) => (
                    <tr key={s.year}>
                      <th scope="row">{s.year}</th>
                      {result.plans.map((p, i) => (
                        <td key={i}>
                          {number(
                            p.seasons.find((t) => t.year === s.year)!.summary[
                              metric
                            ],
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            <details className="flow-details">
              <summary>See growing stages and individual days</summary>
              <div className="input-pair">
                <Field label="Sowing date">
                  <select
                    value={planIndex}
                    onChange={(e) => setPlanIndex(+e.target.value)}
                  >
                    {names.map((name, i) => (
                      <option key={i} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Year">
                  <select
                    value={year}
                    onChange={(e) => setYear(+e.target.value)}
                  >
                    {result.plans[0].seasons.map((s) => (
                      <option key={s.year}>{s.year}</option>
                    ))}
                  </select>
                </Field>
              </div>
              {season && (
                <SeasonEvidence
                  season={season}
                  threshold={result.request.heat_threshold_c}
                />
              )}
            </details>
          </>
        )
      )}
    </div>
  );
}
