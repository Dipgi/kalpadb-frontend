import { COUNTRIES, isKnownCountry } from "../lib/countries";

const selectCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

/**
 * Country dropdown storing the ISO alpha-2 code (e.g. "IN"). Keeps an unrecognised
 * legacy value selectable so editing an old record never silently changes its country.
 */
export default function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      <option value="">— None —</option>
      {value && !isKnownCountry(value) && <option value={value}>{value}</option>}
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name} ({c.code})
        </option>
      ))}
    </select>
  );
}
