import { useEffect, useState } from "react";
import { Download, MapPin, RefreshCw } from "lucide-react";
import { api, downloadJSON } from "./api";
import { Field, number } from "./components";

type RecordRow = {
  location: string;
  psgc: string;
  year: number;
  period: string;
  yield_t_ha: number;
};
type Feature = {
  properties: { PSGC_CODE: string; ADM3_EN: string };
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
};
type ContextData = {
  available: boolean;
  message: string;
  records?: RecordRow[];
  geometry?: { features: Feature[] } | null;
  source_url?: string;
  downloaded_at?: string;
  unverified_rows_excluded?: number;
};
type ModelReport = {
  id: string;
  title: string;
  coverage: string;
  limitation: string;
  average_error: number;
  baseline_average_error: number;
  unit: string;
  test_n: number;
  model: string;
  rmse: number;
  baseline_rmse: number;
  persistence_rmse?: number | null;
};
const periods = ["Annual", "Semester 1", "Semester 2"];
const periodLabels: Record<string, string> = {
  Annual: "Whole year",
  "Semester 1": "First reporting semester",
  "Semester 2": "Second reporting semester",
};
const rings = (feature: Feature) =>
  feature.geometry.type === "Polygon"
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.flat();

function MunicipalityMap({
  features,
  values,
  selected,
  onSelect,
}: {
  features: Feature[];
  values: RecordRow[];
  selected: string;
  onSelect: (code: string) => void;
}) {
  const points = features.flatMap((feature) => rings(feature).flat());
  if (!points.length) return <p>Map boundaries are unavailable.</p>;
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const cosine = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const scale = Math.min(600 / ((maxX - minX) * cosine), 380 / (maxY - minY));
  const offsetX = (640 - (maxX - minX) * cosine * scale) / 2;
  const offsetY = (420 - (maxY - minY) * scale) / 2;
  const path = (feature: Feature) =>
    rings(feature)
      .map(
        (ring) =>
          ring
            .map(
              (p, i) =>
                `${i ? "L" : "M"}${(offsetX + (p[0] - minX) * cosine * scale).toFixed(2)},${(offsetY + (maxY - p[1]) * scale).toFixed(2)}`,
            )
            .join(" ") + "Z",
      )
      .join(" ");
  return (
    <svg
      viewBox="0 0 640 420"
      className="albay-map"
      role="group"
      aria-label="Select a municipality on the Albay map"
    >
      {features.map((feature) => {
        const code = feature.properties.PSGC_CODE;
        const record = values.find((r) => r.psgc === code);
        const label = `${feature.properties.ADM3_EN}: ${record ? `${number(record.yield_t_ha, 2)} tonnes per hectare` : "no estimate"}`;
        return (
          <path
            key={code}
            d={path(feature)}
            fillRule="evenodd"
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={selected === code}
            className={
              selected === code ? "municipality selected" : "municipality"
            }
            fill={
              record
                ? record.yield_t_ha >= 4
                  ? "#4e8b76"
                  : record.yield_t_ha >= 3
                    ? "#92baa2"
                    : "#d0dfce"
                : "#e9edeb"
            }
            onClick={() => onSelect(code)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(code);
              }
            }}
          >
            <title>{label}</title>
          </path>
        );
      })}
    </svg>
  );
}

export default function AlbayData() {
  const [data, setData] = useState<ContextData>();
  const [reports, setReports] = useState<ModelReport[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [municipality, setMunicipality] = useState("0500506000");
  const [year, setYear] = useState(2025);
  const [period, setPeriod] = useState("Annual");
  async function load() {
    setBusy(true);
    setError("");
    const results = await Promise.allSettled([
      api<ContextData>("/research/albay"),
      api<ModelReport[]>("/research/models"),
    ]);
    if (results[0].status === "fulfilled") setData(results[0].value);
    if (results[1].status === "fulfilled") setReports(results[1].value);
    if (results.some((result) => result.status === "rejected"))
      setError("Some data could not be loaded. Please try again.");
    setBusy(false);
  }
  useEffect(() => {
    void load();
  }, []);
  const rows = data?.records ?? [];
  const places = [
    ...new Map(rows.map((r) => [r.psgc, r.location])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a);
  const selected = rows.find(
    (r) => r.psgc === municipality && r.year === year && r.period === period,
  );
  const current = rows.filter((r) => r.year === year && r.period === period);
  const history = rows
    .filter((r) => r.psgc === municipality && r.period === period)
    .sort((a, b) => a.year - b.year);
  const ceiling = Math.max(1, ...history.map((r) => r.yield_t_ha));
  return (
    <div className="albay-data">
      {busy && (
        <p className="message loading" role="status">
          Loading Albay data…
        </p>
      )}
      {error && (
        <div className="message error" role="alert">
          {error}{" "}
          <button className="text-button" onClick={() => void load()}>
            Retry Albay data
          </button>
        </div>
      )}
      {data && !data.available && (
        <div className="empty-state">
          <MapPin size={28} />
          <h2>Albay data is not available here yet</h2>
          <p>{data.message}</p>
          <p>
            Download the public Albay data on the computer running TerraProof,
            then reload.
          </p>
          <button className="button secondary" onClick={() => void load()}>
            <RefreshCw size={16} /> Reload data
          </button>
        </div>
      )}
      {data?.available && (
        <>
          <div className="data-intro">
            <span className="data-badge">Historical estimates</span>
            <p>
              Explore rice yield reported for each municipality. These averages
              describe an area, not the harvest on a particular farm.
            </p>
          </div>
          <div className="data-filters">
            <Field label="Municipality or city">
              <select
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
              >
                {places.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reporting year">
              <select value={year} onChange={(e) => setYear(+e.target.value)}>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </Field>
            <Field label="Reporting period">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {periodLabels[p]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="data-explorer">
            <section
              className="data-map-panel"
              aria-label="Municipal yield map"
            >
              {data.geometry ? (
                <MunicipalityMap
                  features={data.geometry.features}
                  values={current}
                  selected={municipality}
                  onSelect={setMunicipality}
                />
              ) : (
                <p>
                  Map boundaries are unavailable. Choose a municipality from the
                  list above.
                </p>
              )}
              <div className="map-key">
                <span>
                  <i style={{ background: "#d0dfce" }} /> Under 3
                </span>
                <span>
                  <i style={{ background: "#92baa2" }} /> 3 to under 4
                </span>
                <span>
                  <i style={{ background: "#4e8b76" }} /> 4 or more
                </span>
              </div>
              <p className="muted">
                Tonnes per hectare · select an area to explore
              </p>
            </section>
            <section
              className="data-reading"
              aria-live="polite"
              aria-label="Selected municipal estimate"
            >
              <span>
                {selected?.location ??
                  places.find(([code]) => code === municipality)?.[1]}
              </span>
              <h2>{selected ? number(selected.yield_t_ha, 2) : "No data"}</h2>
              <p>tonnes of rice per hectare</p>
              <small>
                {year} · {periodLabels[period]} · municipal estimate
              </small>
              <h3>How it changed over time</h3>
              <div
                className="history-chart"
                role="img"
                aria-label={`Historical yield estimates for ${selected?.location ?? "selected municipality"}. Exact values are in the table below.`}
              >
                {history.map((r) => (
                  <div key={r.year} className="history-column">
                    <div className="history-bar-space">
                      <span
                        style={{ height: `${(r.yield_t_ha / ceiling) * 100}%` }}
                        title={`${r.year}: ${r.yield_t_ha} tonnes per hectare`}
                      />
                    </div>
                    <small>{String(r.year).slice(-2)}</small>
                  </div>
                ))}
              </div>
              <details>
                <summary>Show yearly numbers</summary>
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Tonnes per hectare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r) => (
                      <tr key={r.year}>
                        <th scope="row">{r.year}</th>
                        <td>{number(r.yield_t_ha, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
          </div>
          <div className="data-source">
            <div>
              <strong>Source: PhilRice RiceLytics</strong>
              <p>
                2018–2025 · 18 municipalities and cities · annual and semester
                summaries overlap.
              </p>
              <p>
                2026 values are excluded until their availability is confirmed.
                These estimates are not used as measured field labels in
                training.
              </p>
            </div>
            <a href={data.source_url} target="_blank" rel="noreferrer">
              View source ↗
            </a>
            <button
              className="button secondary"
              onClick={() =>
                downloadJSON(
                  {
                    records: rows,
                    source: data.source_url,
                    role: "context_only",
                  },
                  "terraproof-albay-context.json",
                )
              }
            >
              <Download size={16} />
              Download Albay data
            </button>
          </div>
        </>
      )}
      <section className="experiment-section">
        <div className="section-heading">
          <div>
            <h2>Saved model experiments</h2>
            <p>
              Results from research runs. These are not farm predictions and do
              not change the planting comparison.
            </p>
          </div>
        </div>
        {!busy && reports.length === 0 && (
          <p>No saved experiment reports are available on this computer.</p>
        )}
        <div className="experiment-grid">
          {reports.map((report) => (
            <article className="experiment-card" key={report.id}>
              <span className="data-badge">Research only</span>
              <h3>{report.title}</h3>
              <p>{report.coverage}</p>
              <span className="error-label">Average prediction error</span>
              <strong>{number(report.average_error, 3)}</strong>
              <span>{report.unit}</span>
              <p>
                Simple average baseline:{" "}
                {number(report.baseline_average_error, 3)} {report.unit}.
              </p>
              <p className="experiment-limit">{report.limitation}</p>
              <details>
                <summary>How this was evaluated</summary>
                <p>
                  {report.test_n} test observations. Model:{" "}
                  {report.model.replaceAll("_", " ")}.
                </p>
                <p>
                  Root mean squared error: {number(report.rmse, 3)}; average
                  baseline: {number(report.baseline_rmse, 3)} ({report.unit}).
                </p>
                {report.persistence_rmse != null && (
                  <p>
                    Repeating last year's yield:{" "}
                    {number(report.persistence_rmse, 3)} tonnes per hectare by
                    the same error measure.
                  </p>
                )}
                <p>
                  Soil-moisture and trial results do not establish accuracy on
                  Albay farms.
                </p>
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
