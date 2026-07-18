import { catalogue } from "../lib/api";
import EntityPicker, { type PickerItem } from "./EntityPicker";

export interface EditorshipRow {
  person: PickerItem | null;
  start_year: string;
  end_year: string;
  role: string;
}

export const EMPTY_EDITORSHIP: EditorshipRow = {
  person: null,
  start_year: "",
  end_year: "",
  role: "",
};

const inputCls =
  "w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const ROLES = ["founding", "chief", "guest", "co-editor"];

/**
 * Repeatable editor of a magazine's title-level editor tenure: who ran the
 * magazine and when. Each row is one stint (editor + optional year range + role).
 * Editors must already exist as people (no inline create here).
 */
export default function MagazineEditorshipEditor({
  rows,
  onChange,
}: {
  rows: EditorshipRow[];
  onChange: (rows: EditorshipRow[]) => void;
}) {
  function update(i: number, patch: Partial<EditorshipRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="border border-gray-100 rounded-md p-3 space-y-2 bg-gray-50/50">
            <EntityPicker
              label="Editor"
              placeholder="Search a person…"
              fetchKey="picker-persons"
              fetcher={(q) => catalogue.personPicker(q)}
              selected={row.person ? [row.person] : []}
              onChange={(items) => update(i, { person: items[items.length - 1] ?? null })}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">From (year)</label>
                <input
                  type="number"
                  value={row.start_year}
                  onChange={(e) => update(i, { start_year: e.target.value })}
                  min={1800}
                  max={2100}
                  placeholder="1963"
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
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">Role</label>
                <select
                  value={row.role}
                  onChange={(e) => update(i, { role: e.target.value })}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              className="text-xs text-red-500 hover:underline"
            >
              Remove editor
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { ...EMPTY_EDITORSHIP }])}
        className="mt-2 text-sm text-violet-700 hover:underline"
      >
        + Add editor
      </button>
    </div>
  );
}

/** Convert editor rows into the API payload, dropping rows with no person chosen. */
export function editorshipsToPayload(rows: EditorshipRow[]) {
  return rows
    .filter((r) => r.person)
    .map((r) => ({
      stakeholder_id: r.person!.id,
      start_year: r.start_year.trim() ? Number(r.start_year) : null,
      end_year: r.end_year.trim() ? Number(r.end_year) : null,
      role: r.role || null,
    }));
}
