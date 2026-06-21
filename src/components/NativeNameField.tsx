import { useQuery } from "@tanstack/react-query";
import { catalogue } from "../lib/api";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

/**
 * Optional native-script name for an entity, in its primary language.
 * Only shown once a (non-English) primary language is chosen — the name in that
 * script is stored as a localised override and featured next to the English name.
 */
export default function NativeNameField({
  primaryLanguage,
  value,
  onChange,
}: {
  primaryLanguage: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });

  if (!primaryLanguage || primaryLanguage === "en") return null;

  const lang = languages?.find((l) => l.code === primaryLanguage);
  const langLabel = lang ? `${lang.name}${lang.name_local ? ` (${lang.name_local})` : ""}` : primaryLanguage;

  return (
    <div>
      <label className={labelCls}>Name in {langLabel}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        lang={primaryLanguage}
        placeholder={`Native-script name (optional)`}
        className={inputCls}
      />
      <p className="mt-1 text-xs text-gray-400">
        Optional. The name written in {lang?.name ?? "the primary language"}’s script, shown
        alongside the English name.
      </p>
    </div>
  );
}
