import { catalogue, type CoverageContributorEntry, type CoverageContributorInput } from "../lib/api";
import EntityPicker, { type PickerItem } from "./EntityPicker";
import BylineFields from "./BylineFields";
import { COVERAGE_ROLE_OPTIONS } from "../lib/workTypes";

const OTHER = "__other__";

export interface ContributorRow {
  person: PickerItem | null;
  role: string;
  customRole: string;
}

export const EMPTY_CONTRIBUTOR: ContributorRow = { person: null, role: "author", customRole: "" };

const inputCls =
  "w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

function effectiveRole(row: ContributorRow): string {
  return (row.role === OTHER ? row.customRole : row.role).trim();
}

const roleLabel = (r: string) => r.charAt(0).toUpperCase() + r.slice(1).replaceAll("_", " ");

/**
 * Repeatable contributor editor for a CoverageItem — mirrors
 * MediaCreditsEditor's shape (person + role + shared byline overlay), but
 * without character_name/is_primary, which don't apply to press coverage.
 * A contributor with role='author' doubles as the work's byline in browse.
 */
export default function CoverageContributorsEditor({
  rows,
  onChange,
  bylines,
  onBylinesChange,
  onCreatePerson,
  admin = false,
}: {
  rows: ContributorRow[];
  onChange: (rows: ContributorRow[]) => void;
  bylines: Record<number, string>;
  onBylinesChange: (next: Record<number, string>) => void;
  onCreatePerson?: (name: string) => Promise<PickerItem>;
  admin?: boolean;
}) {
  function update(i: number, patch: Partial<ContributorRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row, i) => (
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">Role</label>
                <select
                  value={row.role}
                  onChange={(e) => update(i, { role: e.target.value })}
                  className={inputCls}
                >
                  {COVERAGE_ROLE_OPTIONS.map((r) => (
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
                    className={inputCls}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              className="text-xs text-red-500 hover:underline"
            >
              Remove contributor
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { ...EMPTY_CONTRIBUTOR }])}
        className="mt-2 text-sm text-violet-700 hover:underline"
      >
        + Add contributor
      </button>
    </div>
  );
}

export function contributorRowsToPayload(rows: ContributorRow[]): CoverageContributorInput[] {
  return rows
    .filter((r) => r.person && effectiveRole(r))
    .map((r) => ({ stakeholder_id: r.person!.id, role: effectiveRole(r) }));
}

export function contributorPeople(rows: ContributorRow[]): PickerItem[] {
  return rows.filter((r) => r.person).map((r) => r.person!);
}

/** Rebuild editable rows from an item's existing contributors (for the edit page). */
export function contributorRowsFromExisting(
  contributors: CoverageContributorEntry[]
): ContributorRow[] {
  return contributors.map((c) => ({
    person: { id: c.stakeholder.id, name: c.stakeholder.name },
    role: COVERAGE_ROLE_OPTIONS.includes(c.role) ? c.role : OTHER,
    customRole: COVERAGE_ROLE_OPTIONS.includes(c.role) ? "" : c.role,
  }));
}
