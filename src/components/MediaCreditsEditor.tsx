import { catalogue, type MediaCredit, type MediaCreditInput } from "../lib/api";
import EntityPicker, { type PickerItem } from "./EntityPicker";
import BylineFields from "./BylineFields";
import { MEDIA_ROLE_OPTIONS } from "../lib/workTypes";

/** Sentinel select value for a role not in the curated list. */
const OTHER = "__other__";

export interface CreditRow {
  person: PickerItem | null;
  /** Curated role value, or OTHER (with the actual role in customRole). */
  role: string;
  customRole: string;
  character_name: string;
  is_primary: boolean;
}

export const EMPTY_CREDIT: CreditRow = {
  person: null,
  role: "",
  customRole: "",
  character_name: "",
  is_primary: false,
};

const inputCls =
  "w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

function effectiveRole(row: CreditRow): string {
  return (row.role === OTHER ? row.customRole : row.role).trim();
}

function roleOptionsFor(contentType: string): string[] {
  return MEDIA_ROLE_OPTIONS[contentType] ?? MEDIA_ROLE_OPTIONS.film;
}

const roleLabel = (r: string) => r.replaceAll("_", " ");

/**
 * Repeatable cast & crew editor for a media work. Each row is one credit
 * (person + role + optional character/lead flag). The curated role dropdown
 * follows the media type (director for films, singer for songs, playwright
 * for stage dramas…) with an "Other…" free-text escape hatch. Rows round-trip
 * the full credit set — the API replaces all credits on save.
 */
export default function MediaCreditsEditor({
  rows,
  onChange,
  contentType,
  bylines,
  onBylinesChange,
  onCreatePerson,
  admin = false,
}: {
  rows: CreditRow[];
  onChange: (rows: CreditRow[]) => void;
  contentType: string;
  /** Shared byline map ({person id: name-as-credited}) — one per work. */
  bylines: Record<number, string>;
  onBylinesChange: (b: Record<number, string>) => void;
  onCreatePerson?: (name: string, opts?: { allowDuplicate?: boolean }) => Promise<PickerItem>;
  admin?: boolean;
}) {
  const roles = roleOptionsFor(contentType);

  function update(i: number, patch: Partial<CreditRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row, i) => {
          const showCharacter = effectiveRole(row).includes("actor");
          return (
            <div key={i} className="border border-gray-100 rounded-md p-3 space-y-2 bg-gray-50/50">
              <EntityPicker
                label="Person"
                placeholder="Search or create a person…"
                fetchKey="picker-persons"
                fetcher={(q) => catalogue.personPicker(q)}
                selected={row.person ? [row.person] : []}
                onChange={(items) => update(i, { person: items[items.length - 1] ?? null })}
                onCreate={onCreatePerson}
              />
              {row.person && (
                <BylineFields
                  people={[row.person]}
                  bylines={bylines}
                  onChange={onBylinesChange}
                  admin={admin}
                />
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-0.5">Role</label>
                  <select
                    value={row.role}
                    onChange={(e) => update(i, { role: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                    <option value={OTHER}>Other…</option>
                  </select>
                </div>
                {row.role === OTHER && (
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-0.5">Custom role</label>
                    <input
                      value={row.customRole}
                      onChange={(e) => update(i, { customRole: e.target.value })}
                      placeholder="e.g. choreographer"
                      className={inputCls}
                    />
                  </div>
                )}
                {showCharacter && (
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-0.5">Character played</label>
                    <input
                      value={row.character_name}
                      onChange={(e) => update(i, { character_name: e.target.value })}
                      placeholder="e.g. Professor Shonku"
                      className={inputCls}
                    />
                  </div>
                )}
                <label className="flex items-end gap-1.5 pb-1.5 text-xs text-gray-600 select-none">
                  <input
                    type="checkbox"
                    checked={row.is_primary}
                    onChange={(e) => update(i, { is_primary: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Lead credit
                </label>
              </div>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                className="text-xs text-red-500 hover:underline"
              >
                Remove credit
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { ...EMPTY_CREDIT }])}
        className="mt-2 text-sm text-violet-700 hover:underline"
      >
        + Add credit
      </button>
    </div>
  );
}

/** Rebuild editable rows from a work's existing credits (for the edit page). */
export function creditRowsFromExisting(credits: MediaCredit[], contentType: string): CreditRow[] {
  const roles = roleOptionsFor(contentType);
  return credits.map((c) => ({
    person: { id: c.stakeholder.id, name: c.stakeholder.name },
    role: roles.includes(c.role) ? c.role : OTHER,
    customRole: roles.includes(c.role) ? "" : c.role,
    character_name: c.character_name ?? "",
    is_primary: c.is_primary,
  }));
}

/** Convert credit rows into the API payload, dropping incomplete rows. */
export function creditRowsToPayload(rows: CreditRow[]): MediaCreditInput[] {
  return rows
    .filter((r) => r.person && effectiveRole(r))
    .map((r) => ({
      stakeholder_id: r.person!.id,
      role: effectiveRole(r),
      character_name: r.character_name.trim() || null,
      is_primary: r.is_primary,
    }));
}

/** People selected across all credit rows (for the byline payload helper). */
export function creditPeople(rows: CreditRow[]): PickerItem[] {
  return rows.filter((r) => r.person).map((r) => r.person!);
}
