import { catalogue, type AcademicAuthorEntry, type AcademicAuthorInput } from "../lib/api";
import EntityPicker, { type PickerItem } from "./EntityPicker";

export interface AuthorRow {
  person: PickerItem | null;
  affiliation: string;
  isCorresponding: boolean;
  creditedAs: string;
}

export const EMPTY_AUTHOR: AuthorRow = {
  person: null,
  affiliation: "",
  isCorresponding: false,
  creditedAs: "",
};

const inputCls =
  "w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

/**
 * Ordered author list for an AcademicArticle. Row position IS the citation
 * author_order (1-indexed) — reorder with the ↑/↓ buttons, not by dragging
 * text. Unlike MediaCreditsEditor's shared byline overlay, each row carries
 * its own credited_as since author order/affiliation are already per-row.
 */
export default function AcademicAuthorsEditor({
  rows,
  onChange,
  onCreatePerson,
}: {
  rows: AuthorRow[];
  onChange: (rows: AuthorRow[]) => void;
  onCreatePerson?: (name: string) => Promise<PickerItem>;
}) {
  function update(i: number, patch: Partial<AuthorRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="border border-gray-100 rounded-md p-3 space-y-2 bg-gray-50/50">
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center pt-1 text-gray-400 shrink-0">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="disabled:opacity-30 hover:text-violet-700"
                  aria-label="Move author up"
                >
                  ▲
                </button>
                <span className="text-xs">{i + 1}</span>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  className="disabled:opacity-30 hover:text-violet-700"
                  aria-label="Move author down"
                >
                  ▼
                </button>
              </div>
              <div className="flex-1">
                <EntityPicker
                  label="Author"
                  placeholder="Search or create a person…"
                  fetchKey="picker-persons"
                  fetcher={(q) => catalogue.personPicker(q)}
                  selected={row.person ? [row.person] : []}
                  onChange={(items) => update(i, { person: items[items.length - 1] ?? null })}
                  onCreate={onCreatePerson}
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                className="text-xs text-red-500 hover:underline shrink-0 pt-1"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-7">
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">Affiliation</label>
                <input
                  value={row.affiliation}
                  onChange={(e) => update(i, { affiliation: e.target.value })}
                  placeholder="University / institution"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">
                  Credited as (optional)
                </label>
                <input
                  value={row.creditedAs}
                  onChange={(e) => update(i, { creditedAs: e.target.value })}
                  placeholder="As printed, if different"
                  className={inputCls}
                />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 self-end pb-1.5">
                <input
                  type="checkbox"
                  checked={row.isCorresponding}
                  onChange={(e) => update(i, { isCorresponding: e.target.checked })}
                />
                Corresponding author
              </label>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { ...EMPTY_AUTHOR }])}
        className="mt-2 text-sm text-violet-700 hover:underline"
      >
        + Add author
      </button>
    </div>
  );
}

/** Row order becomes author_order (1-indexed) — never re-derived server-side. */
export function authorRowsToPayload(rows: AuthorRow[]): AcademicAuthorInput[] {
  return rows
    .filter((r) => r.person)
    .map((r, i) => ({
      stakeholder_id: r.person!.id,
      author_order: i + 1,
      affiliation: r.affiliation.trim() || null,
      is_corresponding: r.isCorresponding,
      credited_as: r.creditedAs.trim() || null,
    }));
}

/** Rebuild editable rows from an article's existing authors (for the edit page). */
export function authorRowsFromExisting(authors: AcademicAuthorEntry[]): AuthorRow[] {
  return [...authors]
    .sort((a, b) => a.author_order - b.author_order)
    .map((a) => ({
      person: { id: a.stakeholder.id, name: a.stakeholder.name },
      affiliation: a.affiliation ?? "",
      isCorresponding: a.is_corresponding,
      creditedAs: a.credited_as ?? "",
    }));
}
