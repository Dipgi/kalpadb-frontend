import { useQuery } from "@tanstack/react-query";
import { catalogue } from "../lib/api";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

/**
 * Selector for an entity's native/primary language (person or publisher).
 * Marks which localised name form to feature alongside the canonical English name.
 * Empty = none (e.g. a foreign author with only an English name).
 */
export default function PrimaryLanguageSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });

  return (
    <div>
      <label className={labelCls}>Primary language</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">— none —</option>
        {(languages ?? []).map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
            {l.name_local && l.name_local !== l.name ? ` (${l.name_local})` : ""}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-400">
        The native language whose name form is featured alongside the English name. Leave as
        “none” for foreign names that only have an English spelling.
      </p>
    </div>
  );
}
