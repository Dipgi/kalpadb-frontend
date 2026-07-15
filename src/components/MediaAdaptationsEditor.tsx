import { search, type MediaAdaptationInput } from "../lib/api";
import EntityPicker, { type PickerItem } from "./EntityPicker";
import { ADAPTATION_TYPE_OPTIONS } from "../lib/workTypes";

export interface AdaptationRow {
  work: PickerItem | null;
  adaptation_type: MediaAdaptationInput["adaptation_type"];
  notes: string;
}

export const EMPTY_ADAPTATION: AdaptationRow = {
  work: null,
  adaptation_type: "direct",
  notes: "",
};

const inputCls =
  "w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

/**
 * Repeatable "based on" editor: the catalogued work(s) this media work adapts
 * (a film of a novel, an anthology film of three stories…). Rows round-trip
 * the full set — the API replaces all adaptation links on save.
 */
export default function MediaAdaptationsEditor({
  rows,
  onChange,
  selfId,
}: {
  rows: AdaptationRow[];
  onChange: (rows: AdaptationRow[]) => void;
  /** Exclude this work (the media work being edited) from search results. */
  selfId?: number;
}) {
  function update(i: number, patch: Partial<AdaptationRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="border border-gray-100 rounded-md p-3 space-y-2 bg-gray-50/50">
            <EntityPicker
              label="Source work"
              placeholder="Search the book / story it adapts…"
              fetchKey="picker-works"
              fetcher={(q) =>
                search.query(q).then((r) => ({
                  items: r.works
                    .filter((w) => w.id !== selfId)
                    .map((w) => ({ id: w.id, name: w.title })),
                }))
              }
              selected={row.work ? [row.work] : []}
              onChange={(items) => update(i, { work: items[items.length - 1] ?? null })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">Adaptation type</label>
                <select
                  value={row.adaptation_type}
                  onChange={(e) =>
                    update(i, {
                      adaptation_type: e.target.value as AdaptationRow["adaptation_type"],
                    })
                  }
                  className={inputCls}
                >
                  {ADAPTATION_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">Note (optional)</label>
                <input
                  value={row.notes}
                  onChange={(e) => update(i, { notes: e.target.value })}
                  placeholder="e.g. adapts only the first half"
                  className={inputCls}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              className="text-xs text-red-500 hover:underline"
            >
              Remove source
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { ...EMPTY_ADAPTATION }])}
        className="mt-2 text-sm text-violet-700 hover:underline"
      >
        + Add source work
      </button>
    </div>
  );
}

/** Rebuild editable rows from a work's existing adaptation links. */
export function adaptationRowsFromExisting(
  adaptations: { source_work: { id: number; title: string }; adaptation_type: string; notes: string | null }[]
): AdaptationRow[] {
  return adaptations.map((a) => ({
    work: { id: a.source_work.id, name: a.source_work.title },
    adaptation_type: (a.adaptation_type || "direct") as AdaptationRow["adaptation_type"],
    notes: a.notes ?? "",
  }));
}

/** Convert adaptation rows into the API payload, dropping rows with no work chosen. */
export function adaptationRowsToPayload(rows: AdaptationRow[]): MediaAdaptationInput[] {
  return rows
    .filter((r) => r.work)
    .map((r) => ({
      source_lw_id: r.work!.id,
      adaptation_type: r.adaptation_type,
      notes: r.notes.trim() || null,
    }));
}
