import { useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Sprout } from "lucide-react";
import { api, downloadJSON } from "./api";
import type { SoilRequest } from "./soil-types";
import type {
  CropScreen,
  FutureReport,
  PlantingReport,
  PlantingRequest,
  Summary,
} from "./planting-types";

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
const number = (value: number | null | undefined, precision = 0) =>
  value == null ? "Not available" : value.toFixed(precision);
const range = (value: Summary, precision = 0) =>
  value.min == null
    ? "Not available"
    : `${number(value.min, precision)}–${number(value.max, precision)}`;
const shortDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
const STATUS = {
  reference_match: "pH and temperature fit the reference",
  local_review: "Some conditions need local review",
  outside_reference: "Outside a reference range",
  needs_data: "More data needed for these checks",
};

function CropRow({ crop }: { crop: CropScreen }) {
  const r = crop.reference;
  return (
    <details className={`crop-row crop-${crop.status}`}>
      <summary>
        <span>
          <strong>{crop.name}</strong>
          <span>{STATUS[crop.status]}</span>
        </span>
        <span className="crop-duration">
          {r.indicative_days[0]}–{r.indicative_days[1]} days
          <small>
            about {(r.indicative_days[0] / 30.44).toFixed(1)}–
            {(r.indicative_days[1] / 30.44).toFixed(1)} months
          </small>
        </span>
      </summary>
      <div className="crop-explanation">
        <p>
          <b>Possible harvest timing:</b>{" "}
          {shortDate(crop.indicative_harvest_window[0])} to{" "}
          {shortDate(crop.indicative_harvest_window[1])}, assuming planting on{" "}
          {shortDate(crop.planting_reference)}. This is a published planning
          range; your local variety and weather can change it.
        </p>
        <dl className="crop-checks">
          <div>
            <dt>Soil acidity (pH)</dt>
            <dd>
              Map estimate {number(crop.soil_ph, 1)}. FAO preferred reference:{" "}
              {r.ph.optimal.join("–")}.
            </dd>
          </div>
          <div>
            <dt>Temperature while growing</dt>
            <dd>
              Typical past season:{" "}
              {number(crop.climate.temperature_c.median, 1)} °C. FAO preferred
              reference: {r.temperature_c.optimal.join("–")} °C.
            </dd>
          </div>
          <div>
            <dt>How often the temperature fit</dt>
            <dd>
              {crop.climate.temperature_matching_seasons} of{" "}
              {crop.climate.complete_seasons} complete past seasons. This count
              is not the chance of success next year.
            </dd>
          </div>
          <div>
            <dt>Rain during the reference season</dt>
            <dd>
              {range(crop.climate.rainfall_mm)} mm across past seasons. Crop
              water-use reference: {r.indicative_water_mm.join("–")} mm.
              Rainfall alone cannot establish water supply.
            </dd>
          </div>
          <div>
            <dt>Runs of days with little rain</dt>
            <dd>
              {range(crop.climate.longest_dry_run_days)} days across past
              seasons. Here, “little rain” means less than 1 mm in a day; it
              does not measure root-zone drought.
            </dd>
          </div>
        </dl>
        <p>
          Past-weather summaries use a {crop.climate.reference_days}-day
          reference season, the midpoint of the published duration range. The
          first day of the selected month is a planning assumption.
        </p>
        {crop.climate.excluded_years.length > 0 && (
          <p>
            Excluded planting years with incomplete daily data:{" "}
            {crop.climate.excluded_years.join(", ")}. Missing days were not
            filled.
          </p>
        )}
        <h4>Before choosing this crop</h4>
        <ul>
          {crop.needs_checking.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <a href={r.source} target="_blank" rel="noreferrer">
          Read this crop’s FAO reference <ArrowUpRight size={14} />
        </a>
      </div>
    </details>
  );
}

export default function PlantingGuide({
  region,
  stale,
}: {
  region: SoilRequest;
  stale: boolean;
}) {
  const [month, setMonth] = useState(new Date().getUTCMonth() + 1);
  const [year, setYear] = useState(new Date().getUTCFullYear() + 1);
  const [water, setWater] =
    useState<PlantingRequest["water_supply"]>("unknown");
  const [priority, setPriority] =
    useState<PlantingRequest["priority"]>("reference_fit");
  const [data, setData] = useState<PlantingReport>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [futureBusy, setFutureBusy] = useState(false);
  const [futureError, setFutureError] = useState("");
  const [future, setFuture] = useState<FutureReport>();
  const [scenario, setScenario] = useState("ssp245");
  const [futureCrop, setFutureCrop] = useState("maize");
  const request: PlantingRequest = {
    ...region,
    planting_month: month,
    planning_year: year,
    water_supply: water,
    priority,
  };
  // Compare fields, not JSON key order, because server contracts canonicalise the response.
  const changed =
    !!data &&
    (Object.keys(request) as (keyof PlantingRequest)[]).some(
      (key) => request[key] !== data.request[key],
    );
  const futureChanged =
    (!!future &&
      (Object.keys(request) as (keyof PlantingRequest)[]).some(
        (key) => request[key] !== future.request[key],
      )) ||
    (!!future && future.scenario !== scenario);
  async function run() {
    setBusy(true);
    setError("");
    try {
      setData(await api<PlantingReport>("/planting/assess", request));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function runFuture() {
    setFutureBusy(true);
    setFutureError("");
    try {
      setFuture(
        await api<FutureReport>("/planting/future", { ...request, scenario }),
      );
    } catch (e) {
      setFutureError((e as Error).message);
    } finally {
      setFutureBusy(false);
    }
  }
  const maxRain = Math.max(
    1,
    ...(data?.history.monthly.map((row) => row.rainfall_mm.median ?? 0) ?? [1]),
  );
  return (
    <section
      className="planting-guide"
      id="planting-guide"
      aria-labelledby="planting-title"
    >
      <div className="guide-title">
        <div>
          <h2 id="planting-title">What could I plant here?</h2>
          <p>
            Compare crop requirements with this region’s soil estimates and past
            seasons.
          </p>
        </div>
        <Sprout size={28} strokeWidth={1.4} />
      </div>
      <p className="guide-scope">
        This is an early crop shortlist based on soil acidity and seasonal
        temperature. Water, nutrients, drainage and your local variety still
        need checking. It does not predict yield or certify that a crop will
        succeed.
      </p>
      <form
        className="planting-options"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <label>
          Planting month
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Planning year
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from(
              {
                length: Math.max(
                  0,
                  Math.min(10, 2090 - new Date().getUTCFullYear()),
                ),
              },
              (_, i) => new Date().getUTCFullYear() + 1 + i,
            ).map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          Water on your farm
          <select
            value={water}
            onChange={(e) => setWater(e.target.value as typeof water)}
          >
            <option value="unknown">Not sure yet</option>
            <option value="rainfed">Mostly rainfall</option>
            <option value="irrigation">Irrigation is available</option>
          </select>
        </label>
        <label>
          What matters most?
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
          >
            <option value="reference_fit">pH and temperature match</option>
            <option value="shorter_season">A shorter growing season</option>
            <option value="legume_options">Explore legume options</option>
          </select>
        </label>
        <button className="soil-assess" type="submit" disabled={busy || stale}>
          {busy
            ? "Reading past NASA seasons…"
            : "Explore crops and past seasons"}
          <ArrowUpRight size={17} />
        </button>
      </form>
      {water === "rainfed" && (
        <p className="guide-water">
          For a rain-fed farm, confirm whether rain arrives when the crop needs
          it. The rain totals below do not account for runoff, drainage, stored
          soil water or crop water loss.
        </p>
      )}
      {water === "irrigation" && (
        <p className="guide-water">
          Irrigation availability is your stated context. Pump capacity, water
          reliability and application efficiency have not been measured.
        </p>
      )}
      {(changed || stale) && (
        <p className="soil-stale">
          {stale
            ? "The region changed. Assess the selected region above first."
            : "Planting options changed. Explore crops again to update the evidence."}
        </p>
      )}
      {error && (
        <p role="alert" className="soil-error">
          {error} Use the button above to retry.
        </p>
      )}
      {busy && (
        <p role="status">
          Retrieving ten complete prior years from NASA. Only small weather
          extracts are transferred.
        </p>
      )}
      {data && (
        <div className="planting-results" aria-live="polite">
          <section className="past-seasons" id="past-seasons">
            <div className="soil-section-title">
              <h3>What have past seasons been like?</h3>
              <button
                type="button"
                onClick={() =>
                  downloadJSON(data, "terraproof-planting-guide.json")
                }
              >
                <ArrowDownToLine size={16} /> Download evidence
              </button>
            </div>
            <p>
              NASA POWER · {data.history.first_year}–{data.history.last_year} ·{" "}
              {data.history.spatial_support}.
            </p>
            {data.history.status !== "available" && (
              <p className="soil-error">
                Some historical data could not be retrieved. Only complete
                months and seasons are summarised; missing information is not
                evidence of poor soil.
              </p>
            )}
            <figure className="rain-figure">
              <figcaption>
                <b>Rain through the year</b> — taller bars mean more rain. Each
                bar shows the middle value of complete monthly totals across
                past years, not a forecast.
              </figcaption>
              <div
                className="rain-scroll"
                tabIndex={0}
                role="region"
                aria-label="Monthly rainfall chart; scroll horizontally on small screens"
              >
                <div className="rain-months">
                  {data.history.monthly.map((row) => (
                    <div className="rain-month" key={row.month}>
                      <span>
                        {number(row.rainfall_mm.median)}
                        <small> mm</small>
                      </span>
                      <div className="rain-bar-space">
                        <span
                          className={
                            row.rainfall_mm.median == null
                              ? "rain-bar rain-unknown"
                              : "rain-bar"
                          }
                          style={{
                            height: `${row.rainfall_mm.median == null ? 100 : (row.rainfall_mm.median / maxRain) * 100}%`,
                          }}
                        />
                      </div>
                      <strong>{MONTHS[row.month - 1].slice(0, 3)}</strong>
                      <span>{number(row.temperature_c.median, 1)} °C</span>
                    </div>
                  ))}
                </div>
              </div>
              <p>
                1 mm of rain equals 1 litre of water over 1 square metre before
                runoff or other losses. Temperatures beneath the bars show
                typical monthly averages. On small screens, scroll across the
                months.
              </p>
            </figure>
            <details className="guide-method">
              <summary>See the monthly numbers and year counts</summary>
              <div
                className="guide-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Historical monthly weather data"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Typical rain (mm)</th>
                      <th>Past rain range (mm)</th>
                      <th>Typical temperature (°C)</th>
                      <th>Complete years</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.monthly.map((row) => (
                      <tr key={row.month}>
                        <th>{MONTHS[row.month - 1]}</th>
                        <td>{number(row.rainfall_mm.median)}</td>
                        <td>{range(row.rainfall_mm)}</td>
                        <td>{number(row.temperature_c.median, 1)}</td>
                        <td>{row.complete_years}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <section className="crop-shortlist">
            <h3>
              Crop ideas for {MONTHS[data.request.planting_month - 1]} planting
            </h3>
            <p>
              Open a crop to see why it appears, what could limit it and its
              possible time to harvest. Seven crops are compared; this is not a
              complete list of crops grown locally.
            </p>
            <p className="guide-read-key">
              “pH and temperature fit” means two reference checks passed. It
              does not mean every growing requirement has been met. Crop order
              follows these checks, then your chosen priority.
            </p>
            {data.crops.map((crop) => (
              <CropRow key={crop.id} crop={crop} />
            ))}
            <details className="guide-method">
              <summary>How the crop suggestions are made</summary>
              <p>
                FAO Ecocrop supplies preferred and broader pH/temperature ranges
                for each species. We compare them with the selected map horizon
                and the middle of complete historical-season mean temperatures.
                This is a transparent screening rule, not a trained crop-success
                model.
              </p>
              <p>
                {data.method.duration_assumption} {data.method.water_note}
              </p>
              <p>
                The harvest window uses the published duration range from the
                first day of the selected month. A “harvest rate” would mean
                yield or production speed; those are not estimated here.
              </p>
              <a
                href={data.method.cycle_source}
                target="_blank"
                rel="noreferrer"
              >
                FAO duration and water-use tables <ArrowUpRight size={14} />
              </a>
            </details>
          </section>
          <section className="future-planning">
            <h3>Could conditions change in future years?</h3>
            <p>
              The {year} planting plan uses historical experience. To explore
              possible changes, compare two NASA climate-model simulations for{" "}
              {year}–{year + 9}. They do not predict which days will be rainy or
              guarantee stable weather in {year}.
            </p>
            <div className="future-options">
              <label>
                Emissions pathway
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                >
                  <option value="ssp245">
                    SSP2-4.5 — intermediate pathway
                  </option>
                  <option value="ssp585">SSP5-8.5 — very high pathway</option>
                </select>
              </label>
              <button
                type="button"
                disabled={futureBusy || busy || changed || stale}
                onClick={() => void runFuture()}
              >
                {futureBusy
                  ? "Reading NASA climate scenarios…"
                  : "Explore future climate"}
                <ArrowUpRight size={16} />
              </button>
            </div>
            <p className="guide-scope">
              This optional step requests small point extracts for two climate
              models. The first request can take a few minutes; matching
              requests reuse the downloaded snapshots.
            </p>
            {futureBusy && (
              <p role="status">
                NASA is extracting daily temperature and rain for two ten-year
                simulations. The result will appear here; the rest of your
                report remains available.
              </p>
            )}
            {futureError && (
              <p role="alert" className="soil-error">
                {futureError} You can retry the scenario request; the historical
                guide remains available.
              </p>
            )}
            {future && (
              <div className="future-results" aria-live="polite">
                {futureChanged && (
                  <p className="soil-stale">
                    Future options changed. Run the scenario request again; this
                    table still describes the previous request.
                  </p>
                )}
                <div className="soil-section-title">
                  <h4>
                    Possible climate: {future.first_year}–{future.last_year} ·{" "}
                    {future.scenario.toUpperCase()}
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      downloadJSON(future, "terraproof-climate-scenarios.json")
                    }
                  >
                    <ArrowDownToLine size={16} /> Download scenarios
                  </button>
                </div>
                <label className="future-crop">
                  Compare a crop
                  <select
                    value={futureCrop}
                    onChange={(e) => setFutureCrop(e.target.value)}
                  >
                    {data.crops.map((crop) => (
                      <option key={crop.id} value={crop.id}>
                        {crop.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div
                  className="guide-table-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label="Separate NASA climate model results"
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Climate model</th>
                        <th>Typical growing-season temperature</th>
                        <th>Season rain range</th>
                        <th>Seasons within temperature reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {future.models.map((model) => {
                        const crop = model.crops.find(
                          (item) => item.id === futureCrop,
                        );
                        return (
                          <tr key={model.id}>
                            <th>
                              {model.id}
                              <small>
                                {model.status === "available"
                                  ? "Complete model extracts"
                                  : `${model.status} — some data could not be used`}
                              </small>
                            </th>
                            <td>
                              {crop?.climate.temperature_c.median == null
                                ? "No complete season"
                                : `${number(crop.climate.temperature_c.median, 1)} °C`}
                            </td>
                            <td>
                              {crop?.climate.rainfall_mm.min == null
                                ? "No complete season"
                                : `${range(crop.climate.rainfall_mm)} mm`}
                            </td>
                            <td>
                              {crop?.climate.temperature_matching_seasons ?? 0}{" "}
                              of {crop?.climate.complete_seasons ?? 0} simulated
                              seasons
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p>
                  These counts compare seasonal average temperature with a crop
                  reference. They are not crop-survival probabilities.
                  Individual heatwaves, storms, flooding, soil degradation and
                  irrigation adequacy remain separate questions.
                </p>
                <details className="guide-method">
                  <summary>
                    Understand the future scenarios and their limits
                  </summary>
                  <ul>
                    {future.limitations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <a href={future.paper} target="_blank" rel="noreferrer">
                    NASA projection study <ArrowUpRight size={14} />
                  </a>
                </details>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
