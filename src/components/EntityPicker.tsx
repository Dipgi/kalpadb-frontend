import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export interface PickerItem {
  id: number;
  name: string;
}

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

/** Search-as-you-type multi-select with removable chips (authors, publishers…). */
export default function EntityPicker({
  label,
  placeholder,
  fetchKey,
  fetcher,
  selected,
  onChange,
}: {
  label: string;
  placeholder: string;
  fetchKey: string;
  fetcher: (q: string) => Promise<{ items: PickerItem[] }>;
  selected: PickerItem[];
  onChange: (items: PickerItem[]) => void;
}) {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: [fetchKey, q],
    queryFn: () => fetcher(q.trim()),
    enabled: q.trim().length >= 1,
  });

  const results = (data?.items ?? []).filter((r) => !selected.some((s) => s.id === r.id));

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full"
            >
              {s.name}
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => x.id !== s.id))}
                className="hover:text-violet-900 font-bold"
                aria-label={`Remove ${s.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
      {q.trim().length >= 1 && results.length > 0 && (
        <ul className="border border-gray-200 rounded-md mt-1 divide-y divide-gray-100 bg-white max-h-44 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...selected, r]);
                  setQ("");
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-violet-50"
              >
                {r.name} <span className="text-xs text-gray-400">#{r.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
