import type { ReactNode } from "react";
import type { Plan, Result, Season } from "./types";

export const months = [
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
export const number = (value: number | null, digits = 1) =>
  value === null
    ? "—"
    : value.toLocaleString("en-PH", { maximumFractionDigits: digits });
export const peso = (value: number | null) =>
  value === null
    ? "Not defined"
    : new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }).format(value);

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function PlanEditor({
  plan,
  index,
  update,
}: {
  plan: Plan;
  index: number;
  update: (p: Plan) => void;
}) {
  return (
    <fieldset className="plan-editor">
      <legend>
        <span className={`plan-mark plan-${index}`}>
          {String.fromCharCode(65 + index)}
        </span>{" "}
        {plan.name}
      </legend>
      <div className="input-pair">
        <Field label="Sowing month">
          <select
            value={plan.planting_month}
            onChange={(e) =>
              update({ ...plan, planting_month: +e.target.value })
            }
          >
            {months.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sowing day">
          <input
            type="number"
            required
            min={1}
            max={31}
            value={plan.planting_day}
            onChange={(e) => update({ ...plan, planting_day: +e.target.value })}
          />
        </Field>
      </div>
      <div
        className="calendar-strip"
        aria-label={`${plan.stages.map((s) => `${s.name} ${s.days} days`).join(", ")}`}
      >
        {plan.stages.map((stage, i) => (
          <span
            key={stage.name}
            className={`stage-${i}`}
            style={{ flex: stage.days }}
            title={`${stage.name}: ${stage.days} days`}
          >
            {stage.days}d
          </span>
        ))}
      </div>
      <div className="stage-legend">
        <span>Vegetative</span>
        <span>Reproductive</span>
        <span>Ripening</span>
      </div>
      <details>
        <summary>Edit approximate crop calendar</summary>
        <Field label={`Plan ${index + 1} name`}>
          <input
            required
            maxLength={80}
            value={plan.name}
            onChange={(e) => update({ ...plan, name: e.target.value })}
          />
        </Field>
        <Field label="Variety / calendar label">
          <input
            maxLength={100}
            required
            value={plan.variety}
            onChange={(e) => update({ ...plan, variety: e.target.value })}
          />
        </Field>
        <div className="stage-inputs">
          {plan.stages.map((s, i) => (
            <Field key={s.name} label={`${s.name} days`}>
              <input
                type="number"
                required
                min={1}
                max={150}
                value={s.days}
                onChange={(e) =>
                  update({
                    ...plan,
                    stages: plan.stages.map((p, j) =>
                      j === i ? { ...p, days: +e.target.value } : p,
                    ),
                  })
                }
              />
            </Field>
          ))}
        </div>
        <p className="muted">
          Starts at sowing. Default 55 / 30 / 30 days is illustrative; use
          locally reviewed stages.
        </p>
      </details>
    </fieldset>
  );
}

export function YearChart({
  result,
  metric,
}: {
  result: Result;
  metric: "heat_days" | "heavy_rain_days";
}) {
  const years = result.plans[0].seasons.map((s) => s.year);
  const max = Math.max(
    1,
    ...result.plans.flatMap((p) =>
      p.seasons.map((s) => s.summary[metric] ?? 0),
    ),
  );
  const ceiling = Math.ceil((max + 1) / 5) * 5;
  return (
    <div
      className="chart"
      role="img"
      aria-label={`${metric === "heat_days" ? "Heat" : "Heavy-rain"} days by planting year. Exact values follow in the table.`}
    >
      <div className="chart-scale">
        {[ceiling, ceiling / 2, 0].map((n) => (
          <span key={n}>{number(n)}</span>
        ))}
      </div>
      <div className="chart-bars">
        {years.map((year) => (
          <div className="chart-year" key={year}>
            <div className="bar-pair">
              {result.plans.map((p, i) => {
                const value = p.seasons.find((s) => s.year === year)!.summary[
                  metric
                ];
                return (
                  <div
                    key={p.name}
                    className={`bar bar-${i}`}
                    style={{
                      height:
                        value === null ? 0 : `${(value / ceiling) * 100}%`,
                    }}
                    title={`${p.name}, ${year}: ${value ?? "missing"} days`}
                  >
                    <span className="sr-only">
                      {p.name}: {value ?? "missing"}
                    </span>
                  </div>
                );
              })}
            </div>
            <span className="year-label">{String(year).slice(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeasonEvidence({
  season,
  threshold,
}: {
  season: Season;
  threshold: number;
}) {
  const events = season.daily.filter(
    (d) =>
      (d.tmax_c !== null && d.tmax_c >= threshold) ||
      (d.rain_mm !== null && d.rain_mm >= 20) ||
      d.quality_flags.length,
  );
  return (
    <>
      <p className="table-scroll-hint">
        Scroll horizontally to see all stage indicators.
      </p>
      <div
        className="table-wrap"
        tabIndex={0}
        role="region"
        aria-label="Scrollable evidence table"
      >
        <table>
          <caption className="sr-only">Stage exposure and date ranges</caption>
          <thead>
            <tr>
              <th>Crop stage</th>
              <th>Dates</th>
              <th>Heat days</th>
              <th>Rain ≥20 mm days</th>
              <th>Longest dry spell</th>
            </tr>
          </thead>
          <tbody>
            {season.stages.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.name}</th>
                <td>
                  {s.start}
                  <br />
                  <small>to {s.end}</small>
                </td>
                <td>{number(s.heat_days, 0)}</td>
                <td>{number(s.heavy_rain_days, 0)}</td>
                <td>{number(s.longest_dry_spell_days, 0)} days</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="event-details">
        <summary>Inspect {events.length} flagged dates</summary>
        <p className="muted">
          Heat, heavy-rain or data-quality flags. Unflagged days remain in the
          exported daily record.
        </p>
        {events.length === 0 ? (
          <p>No threshold exceedances or missing values in this season.</p>
        ) : (
          <div
            className="table-wrap events"
            tabIndex={0}
            role="region"
            aria-label="Scrollable daily events"
          >
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tmax °C</th>
                  <th>Rain mm</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {events.map((d) => (
                  <tr key={d.date}>
                    <th scope="row">{d.date}</th>
                    <td>{number(d.tmax_c)}</td>
                    <td>{number(d.rain_mm)}</td>
                    <td>
                      {[
                        d.tmax_c !== null && d.tmax_c >= threshold
                          ? "Heat proxy"
                          : "",
                        d.rain_mm !== null && d.rain_mm >= 20
                          ? "Heavy rain"
                          : "",
                        ...d.quality_flags,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </>
  );
}
