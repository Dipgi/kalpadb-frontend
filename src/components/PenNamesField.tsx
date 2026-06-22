import { useQuery } from "@tanstack/react-query";
import { catalogue } from "../lib/api";

/** A single pen name row. Language is optional (the script/language it's written in). */
export type PenName = { alias: string; language: string | null };

// Border styling without a width — width is set per field below so the flex row
// lays out correctly (a shared `w-full` made the select expand and crush the input).
const fieldCls =
  "border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

/**
 * Edit a person's pen names — add as many as needed, each with an optional
 * language/script. alias_type is fixed to "pen_name" by the caller on submit.
 */
export default function PenNamesField({
  value,
  onChange,
}: {
  value: PenName[];
  onChange: (next: PenName[]) => void;
}) {
  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });

  const patch = (i: number, p: Partial<PenName>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { alias: "", language: null }]);

  return (
    <div>
      <label className={labelCls}>Pen names / aliases</label>
      {value.length > 0 && (
        <div className="space-y-2 mb-2">
          {value.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={row.alias}
                onChange={(e) => patch(i, { alias: e.target.value })}
                placeholder="Another name this person writes under"
                className={`${fieldCls} flex-1 min-w-0`}
              />
              <select
                value={row.language ?? ""}
                onChange={(e) => patch(i, { language: e.target.value || null })}
                className={`${fieldCls} w-36 shrink-0`}
                aria-label="Pen name language"
              >
                <option value="">— language —</option>
                {(languages ?? []).map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 px-3 rounded-md border border-gray-200 text-sm text-gray-400 hover:text-red-600 hover:border-red-300"
                aria-label="Remove pen name"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={add}
        className="text-sm text-violet-700 hover:text-violet-900 font-medium"
      >
        + Add pen name
      </button>
      <p className="mt-1 text-xs text-gray-400">
        Other names this author writes under. Each can be in its own language/script.
      </p>
    </div>
  );
}
