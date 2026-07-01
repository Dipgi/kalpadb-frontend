import type { MagazineFrequencyInput } from "../lib/api";
import { FREQUENCY_OPTIONS } from "../lib/frequencies";

export interface FrequencyRow {
  frequency: string;
  start_year: string;
  end_year: string;
}

export const EMPTY_FREQUENCY: FrequencyRow = {
  frequency: "monthly",
  start_year: "",
  end_year: "",
};

const inputCls =
  "w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

/**
 * Repeatable editor of a magazine's release-cadence history. Each row is one
 * period the magazine held a given frequency (e.g. Fortnightly 1974–1980).
 * Years are optional — a single-cadence magazine is just one dateless row.
 */
export default function MagazineFrequencyEditor({
  rows,
  onChange,
}: {
  rows: FrequencyRow[];
  onChange: (rows: FrequencyRow[]) => void;
}) {
  function update(i: number, patch: Partial<FrequencyRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="border border-gray-100 rounded-md p-3 space-y-2 bg-gray-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">Frequency</label>
                <select
                  value={row.frequency}
                  onChange={(e) => update(i, { frequency: e.target.value })}
                  className={inputCls}
                >
                  {FREQUENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">From (year)</label>
                <input
                  type="number"
                  value={row.start_year}
                  onChange={(e) => update(i, { start_year: e.target.value })}
                  min={1800}
                  max={2100}
                  placeholder="optional"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">To (year)</label>
                <input
                  type="number"
                  value={row.end_year}
                  onChange={(e) => update(i, { end_year: e.target.value })}
                  min={1800}
                  max={2100}
                  placeholder="blank if ongoing"
                  className={inputCls}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              className="text-xs text-red-500 hover:underline"
            >
              Remove period
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { ...EMPTY_FREQUENCY }])}
        className="mt-2 text-sm text-violet-700 hover:underline"
      >
        + Add frequency period
      </button>
    </div>
  );
}

/** Convert frequency rows into the API payload, dropping rows with no frequency. */
export function frequenciesToPayload(rows: FrequencyRow[]): MagazineFrequencyInput[] {
  return rows
    .filter((r) => r.frequency)
    .map((r) => ({
      frequency: r.frequency,
      start_year: r.start_year.trim() ? Number(r.start_year) : null,
      end_year: r.end_year.trim() ? Number(r.end_year) : null,
    }));
}
