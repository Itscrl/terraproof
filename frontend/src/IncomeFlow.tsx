import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Field, NumberInput, months, number, peso } from "./components";
import type { Economics, Request, Result } from "./types";
const costs = [
  "seeds_php_ha",
  "fertilizer_php_ha",
  "labor_php_ha",
  "irrigation_php_ha",
  "other_php_ha",
] as const;
const labels = ["Seeds", "Fertilizer", "Labor", "Irrigation", "Other expenses"];
export default function IncomeFlow({
  request,
  result,
  busy,
  update,
  calculate,
  onDates,
}: {
  request: Request;
  result?: Result;
  busy: boolean;
  update: (r: Request) => void;
  calculate: () => Promise<boolean>;
  onDates: () => void;
}) {
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [showResult, setShowResult] = useState(false);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo(0, 0);
  }, [showResult, index]);
  const plan = request.plans[index];
  const values = plan.economics;
  const total = costs.reduce((sum, key) => sum + values[key], 0);
  const label = `${months[plan.planting_month - 1]} ${plan.planting_day}`;
  const change = (patch: Partial<Economics>) => {
    setShowResult(false);
    update({
      ...request,
      plans: request.plans.map((p, i) =>
        i === index ? { ...p, economics: { ...p.economics, ...patch } } : p,
      ),
    });
  };
  const money = result?.plans[index].economics;
  return (
    <div className="income-flow">
      <div className="flow-heading">
        <span className="flow-eyebrow">Optional · Check your income</span>
        <h1 ref={heading} tabIndex={-1}>
          {showResult ? "Your income estimate" : "What might you earn?"}
        </h1>
        <p>
          {showResult
            ? "Based on the harvest, prices and expenses you entered."
            : "Use your own harvest estimate and prices. We’ll subtract your expenses from your sales."}
        </p>
      </div>
      <div
        className="income-date-picker"
        role="group"
        aria-label="Choose a planting date for the income estimate"
      >
        {request.plans.map((p, i) => (
          <button
            key={i}
            className={i === index ? "selected" : ""}
            aria-pressed={i === index}
            onClick={() => {
              setIndex(i);
              setShowResult(false);
            }}
          >
            {months[p.planting_month - 1]} {p.planting_day}
          </button>
        ))}
      </div>
      {!showResult ? (
        <form
          key={index}
          onSubmit={async (e) => {
            e.preventDefault();
            if (await calculate()) setShowResult(true);
          }}
        >
          <p className="sample-note">
            Example amounts are filled in. Replace them with what you expect for
            your farm.
          </p>
          <div className="income-questions">
            <Field
              label="How large is your farm?"
              hint="In hectares. Half a hectare is 0.5."
            >
              <div className="input-with-unit">
                <NumberInput
                  aria-label="Farm area in hectares"
                  min={0.01}
                  max={10000}
                  step=".01"
                  required
                  value={values.area_ha}
                  onValueChange={(value) => change({ area_ha: value })}
                />
                <span>hectares</span>
              </div>
            </Field>
            <Field
              label="How much will you harvest from one hectare?"
              hint="Your estimate, not a prediction. For example, 100 sacks × 50 kg = 5,000 kg."
            >
              <div className="input-with-unit">
                <NumberInput
                  aria-label="Expected harvest in kilograms per hectare"
                  min={0}
                  max={30000}
                  step={1}
                  required
                  value={Math.round(values.yield_t_ha * 1000)}
                  onValueChange={(value) =>
                    change({ yield_t_ha: value / 1000 })
                  }
                />
                <span>kg</span>
              </div>
            </Field>
            <Field
              label="How much will buyers pay per kilogram?"
              hint="Use the price you expect for your palay."
            >
              <div className="input-with-unit">
                <span>₱</span>
                <NumberInput
                  aria-label="Selling price in pesos per kilogram"
                  min={0}
                  max={1000}
                  step=".01"
                  required
                  value={values.price_php_kg}
                  onValueChange={(value) => change({ price_php_kg: value })}
                />
                <span>per kg</span>
              </div>
            </Field>
            <Field
              label="What will you spend on one hectare?"
              hint="Include seeds, fertilizer, labor, irrigation and other expenses."
            >
              <div className="input-with-unit">
                <span>₱</span>
                <NumberInput
                  aria-label="Total expenses in pesos per hectare"
                  min={0}
                  max={1e7}
                  step=".01"
                  required
                  value={total}
                  onValueChange={(value) =>
                    change({
                      seeds_php_ha: 0,
                      fertilizer_php_ha: 0,
                      labor_php_ha: 0,
                      irrigation_php_ha: 0,
                      other_php_ha: value,
                    })
                  }
                />
                <span>per hectare</span>
              </div>
            </Field>
          </div>
          <details className="flow-advanced">
            <summary>
              Break down expenses or record your price source (optional)
            </summary>
            <p>
              Entering a total above replaces the individual expense amounts.
              You can enter each expense here instead.
            </p>
            <div className="income-questions">
              {costs.map((key, i) => (
                <Field key={key} label={`${labels[i]} (pesos per hectare)`}>
                  <NumberInput
                    required
                    min={0}
                    max={1e7}
                    step=".01"
                    value={values[key]}
                    onValueChange={(value) => change({ [key]: value })}
                  />
                </Field>
              ))}
            </div>
            <Field label="Date of your estimate">
              <input
                type="date"
                required
                value={values.assumption_date}
                onChange={(e) => change({ assumption_date: e.target.value })}
              />
            </Field>
            <Field label="Market or source of your prices">
              <input
                required
                maxLength={200}
                value={values.market}
                onChange={(e) => change({ market: e.target.value })}
              />
            </Field>
          </details>
          <div className="flow-actions">
            <button className="button primary" disabled={busy}>
              {busy ? "Calculating…" : "Calculate my income"}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      ) : (
        money && (
          <>
            <div className="income-answer">
              <span>
                {label} · {number(values.area_ha, 2)} hectares
              </span>
              <h2>{peso(money.net)}</h2>
              <p>
                {money.net < 0
                  ? "Estimated loss after expenses"
                  : "Estimated income after expenses"}
              </p>
              <dl>
                <div>
                  <dt>Harvest sales</dt>
                  <dd>{peso(money.revenue)}</dd>
                </div>
                <div>
                  <dt>Expenses</dt>
                  <dd>−{peso(money.total_cost)}</dd>
                </div>
              </dl>
            </div>
            <p className="flow-helper">
              This uses your expected harvest and price. Actual income may be
              different.
            </p>
            <div className="flow-actions">
              <button
                className="button primary"
                onClick={() => setShowResult(false)}
              >
                Adjust my amounts
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setIndex(index === 0 ? 1 : 0);
                  setShowResult(false);
                }}
              >
                Try the other date
              </button>
            </div>
          </>
        )
      )}
      <button className="text-button flow-back" onClick={onDates}>
        <ArrowLeft size={16} />
        Back to my planting comparison
      </button>
    </div>
  );
}
