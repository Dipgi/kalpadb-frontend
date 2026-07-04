import type { PickerItem } from "./EntityPicker";

/**
 * Optional per-credit "credited as" byline inputs, rendered under an author /
 * translator EntityPicker. One row per selected person; leave blank when the
 * work is credited under the canonical name. Example: story bylined "রনিন"
 * while the credit points at Goutam Mandal.
 */
export default function BylineFields({
  people,
  bylines,
  onChange,
}: {
  people: PickerItem[];
  bylines: Record<number, string>;
  onChange: (next: Record<number, string>) => void;
}) {
  if (people.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {people.map((p) => (
        <div key={p.id} className="flex items-center gap-2 text-sm">
          <span className="text-xs text-gray-400 w-40 truncate shrink-0" title={p.name}>
            {p.name}
          </span>
          <input
            type="text"
            value={bylines[p.id] ?? ""}
            onChange={(e) => onChange({ ...bylines, [p.id]: e.target.value })}
            placeholder="credited as… (byline, optional)"
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      ))}
    </div>
  );
}

/** Build the API `credited_as` map: only non-blank bylines for still-selected people. */
export function bylinePayload(
  people: PickerItem[],
  bylines: Record<number, string>
): Record<number, string> {
  const out: Record<number, string> = {};
  for (const p of people) {
    const v = (bylines[p.id] ?? "").trim();
    if (v) out[p.id] = v;
  }
  return out;
}
