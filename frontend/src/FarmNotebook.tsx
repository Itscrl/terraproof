import { useState } from "react";
import { ArrowDownToLine, Save } from "lucide-react";
import { downloadJSON } from "./api";
import { NOTEBOOK_KEY, parseNotebook, sameBounds } from "./farm-notebook";
import type { Notebook, SavedPlot } from "./farm-notebook";
import type { Bounds } from "./soil-types";

export default function FarmNotebook({
  bounds,
  depth,
  onOpen,
}: {
  bounds: Bounds;
  depth: string;
  onOpen: (plot: SavedPlot) => void;
}) {
  const [initial] = useState(() => {
    try {
      return {
        data: parseNotebook(
          localStorage.getItem(NOTEBOOK_KEY) ?? '{"version":1,"plots":[]}',
        ),
        error: "",
      };
    } catch {
      return {
        data: { version: 1, plots: [] } as Notebook,
        error:
          "Existing notebook data could not be read. Nothing was overwritten. Export a working notebook regularly; import a valid backup to recover.",
      };
    }
  });
  const [data, setData] = useState(initial.data);
  const [error, setError] = useState(initial.error);
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [crop, setCrop] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [sampleDate, setSampleDate] = useState("");
  const [sampleDepth, setSampleDepth] = useState("");
  const [ph, setPh] = useState("");
  const [lab, setLab] = useState("");
  const [activeId, setActiveId] = useState("");
  const [undo, setUndo] = useState<Notebook>();
  const active =
    data.plots.find(
      (plot) => plot.id === activeId && sameBounds(plot.bounds, bounds),
    ) ?? data.plots.find((plot) => sameBounds(plot.bounds, bounds));
  function persist(next: Notebook, message: string, removal = false) {
    try {
      const checked = parseNotebook(JSON.stringify(next));
      setUndo(removal ? data : undefined);
      setData(checked);
      localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(checked));
      setError("");
      setNotice(message);
    } catch (e) {
      setError(
        `Could not save: ${(e as Error).message}. Keep this page open and export your notebook.`,
      );
    }
  }
  function update(plot: SavedPlot, message: string, removal = false) {
    persist(
      {
        ...data,
        plots: data.plots.map((item) => (item.id === plot.id ? plot : item)),
      },
      message,
      removal,
    );
  }
  return (
    <details className="farm-notebook" id="farm-notebook">
      <summary>
        <Save size={16} /> Save this plot and keep field records{" "}
        <span>
          {data.plots.length} saved plot{data.plots.length === 1 ? "" : "s"}
        </span>
      </summary>
      <div className="notebook-content">
        <p>
          Your records stay in this browser. Export a backup to keep them or
          move to another device. They are user-entered notes, not verified
          training labels or a prediction of future soil health.
        </p>
        <div className="notebook-transfer">
          <button
            type="button"
            onClick={() => downloadJSON(data, "terraproof-farm-notebook.json")}
          >
            <ArrowDownToLine size={16} /> Export notebook
          </button>
          <label className="notebook-import">
            Import backup
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 1024 * 1024)
                    throw new Error("Backup is larger than 1 MiB");
                  const incoming = parseNotebook(await file.text());
                  const merged = [...data.plots];
                  let copies = 0;
                  for (const plot of incoming.plots) {
                    const existing = merged.find((item) => item.id === plot.id);
                    if (
                      existing &&
                      JSON.stringify(existing) === JSON.stringify(plot)
                    )
                      continue;
                    merged.push(
                      existing
                        ? {
                            ...plot,
                            id: crypto.randomUUID(),
                            name: `${plot.name.slice(0, 62)} (imported copy)`,
                          }
                        : plot,
                    );
                    copies++;
                  }
                  persist(
                    { version: 1, plots: merged },
                    `Imported ${copies} plot record(s); existing plots were preserved.`,
                  );
                } catch (err) {
                  setError(
                    `Could not import: ${(err as Error).message}. Existing records were preserved.`,
                  );
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="soil-error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {undo && (
          <button
            type="button"
            onClick={() => persist(undo, "Removed record restored.")}
          >
            Undo last removal
          </button>
        )}
        {!active && (
          <form
            className="notebook-save"
            onSubmit={(e) => {
              e.preventDefault();
              persist(
                {
                  version: 1,
                  plots: [
                    ...data.plots,
                    {
                      id: crypto.randomUUID(),
                      name: name.trim(),
                      bounds,
                      depth,
                      seasons: [],
                      samples: [],
                    },
                  ],
                },
                "Plot saved on this browser.",
              );
              setName("");
            }}
          >
            <label>
              Name this plot
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                placeholder="For example, north field"
              />
            </label>
            <button type="submit">Save selected plot</button>
          </form>
        )}
        {data.plots.length > 0 && (
          <div className="saved-plot-list">
            {data.plots.map((plot) => (
              <div key={plot.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(plot.id);
                    onOpen(plot);
                  }}
                  aria-pressed={active?.id === plot.id}
                >
                  {plot.name}
                </button>
                <span>
                  {plot.seasons.length} season records · {plot.samples.length}{" "}
                  soil records
                </span>
                <button
                  type="button"
                  aria-label={`Remove plot ${plot.name}`}
                  onClick={() =>
                    persist(
                      {
                        ...data,
                        plots: data.plots.filter((item) => item.id !== plot.id),
                      },
                      "Plot removed. Undo is available until your next change.",
                      true,
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        {active && (
          <div className="active-plot-records">
            <h3>Field notebook: {active.name}</h3>
            <p>
              To understand change over years, keep crop and management records
              alongside repeated, comparable soil tests. Repeated planting alone
              does not establish whether soil is improving or declining.
            </p>
            <details className="guide-method">
              <summary>Record what you planted</summary>
              <form
                className="notebook-record"
                onSubmit={(e) => {
                  e.preventDefault();
                  update(
                    {
                      ...active,
                      seasons: [
                        ...active.seasons,
                        {
                          id: crypto.randomUUID(),
                          crop: crop.trim(),
                          plantingDate: date,
                          notes: notes.trim(),
                        },
                      ],
                    },
                    "Planting record saved.",
                  );
                  setCrop("");
                  setNotes("");
                }}
              >
                <label>
                  Crop planted
                  <input
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    required
                    maxLength={80}
                  />
                </label>
                <label>
                  Actual planting date
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </label>
                <label className="notebook-notes">
                  Management notes
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={1000}
                    placeholder="Variety, fertiliser/manure, residues, irrigation, tillage or problems noticed"
                  />
                </label>
                <button type="submit">Add planting record</button>
              </form>
            </details>
            {active.seasons.length > 0 && (
              <ul className="field-records">
                {[...active.seasons]
                  .sort((a, b) => a.plantingDate.localeCompare(b.plantingDate))
                  .map((row) => (
                    <li key={row.id}>
                      <b>
                        {row.plantingDate} · {row.crop}
                      </b>
                      <span>
                        {row.notes || "No management notes recorded."}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove planting record ${row.plantingDate} ${row.crop}`}
                        onClick={() =>
                          update(
                            {
                              ...active,
                              seasons: active.seasons.filter(
                                (item) => item.id !== row.id,
                              ),
                            },
                            "Planting record removed. Undo is available until your next change.",
                            true,
                          )
                        }
                      >
                        Remove record
                      </button>
                    </li>
                  ))}
              </ul>
            )}
            <details className="guide-method">
              <summary>Record a laboratory pH test</summary>
              <p>
                This first notebook stores pH measured in water. Keep other test
                methods in your original lab report; their values are not
                interchangeable. Matching pH does not establish overall soil
                health.
              </p>
              <form
                className="notebook-record"
                onSubmit={(e) => {
                  e.preventDefault();
                  update(
                    {
                      ...active,
                      samples: [
                        ...active.samples,
                        {
                          id: crypto.randomUUID(),
                          sampleDate,
                          depth: sampleDepth.trim(),
                          phWater: Number(ph),
                          laboratory: lab.trim(),
                        },
                      ],
                    },
                    "Laboratory record saved as user-provided evidence.",
                  );
                  setPh("");
                }}
              >
                <label>
                  Sample date
                  <input
                    type="date"
                    value={sampleDate}
                    onChange={(e) => setSampleDate(e.target.value)}
                    required
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </label>
                <label>
                  Sample depth
                  <input
                    value={sampleDepth}
                    onChange={(e) => setSampleDepth(e.target.value)}
                    maxLength={40}
                    placeholder="For example, 0–15 cm"
                    required
                  />
                </label>
                <label>
                  pH measured in water
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="14"
                    value={ph}
                    onChange={(e) => setPh(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Lab / report reference
                  <input
                    value={lab}
                    onChange={(e) => setLab(e.target.value)}
                    maxLength={120}
                    required
                  />
                </label>
                <button type="submit">Add soil-test record</button>
              </form>
            </details>
            {active.samples.length > 0 && (
              <div
                className="guide-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="User-provided soil-test history"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Sample date</th>
                      <th>Depth</th>
                      <th>pH in water</th>
                      <th>Lab / report</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...active.samples]
                      .sort((a, b) => a.sampleDate.localeCompare(b.sampleDate))
                      .map((row) => (
                        <tr key={row.id}>
                          <th>{row.sampleDate}</th>
                          <td>{row.depth}</td>
                          <td>{row.phWater}</td>
                          <td>{row.laboratory}</td>
                          <td>
                            <button
                              type="button"
                              aria-label={`Remove soil record ${row.sampleDate}`}
                              onClick={() =>
                                update(
                                  {
                                    ...active,
                                    samples: active.samples.filter(
                                      (item) => item.id !== row.id,
                                    ),
                                  },
                                  "Soil record removed. Undo is available until your next change.",
                                  true,
                                )
                              }
                            >
                              Remove record
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            <p>
              We do not turn these records into a health score. Compare the same
              sampling locations, depths and laboratory methods with an adviser
              before interpreting a trend.
            </p>
          </div>
        )}
      </div>
    </details>
  );
}
