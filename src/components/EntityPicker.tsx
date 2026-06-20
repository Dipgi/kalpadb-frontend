import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDuplicateError, type DuplicateCandidate } from "../lib/api";

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
  onCreate,
}: {
  label: string;
  placeholder: string;
  fetchKey: string;
  fetcher: (q: string) => Promise<{ items: PickerItem[] }>;
  selected: PickerItem[];
  onChange: (items: PickerItem[]) => void;
  /**
   * When provided, offers "+ Create '<name>'" to add a new record on the fly.
   * Pass `{ allowDuplicate: true }` to bypass the backend same-name check.
   */
  onCreate?: (name: string, opts?: { allowDuplicate?: boolean }) => Promise<PickerItem>;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  // Possible duplicates returned by the backend when the user tried to create.
  const [dupCandidates, setDupCandidates] = useState<DuplicateCandidate[] | null>(null);
  const { data } = useQuery({
    queryKey: [fetchKey, q],
    queryFn: () => fetcher(q.trim()),
    enabled: q.trim().length >= 1,
  });

  const results = (data?.items ?? []).filter((r) => !selected.some((s) => s.id === r.id));
  const term = q.trim();
  // Offer create when there's no exact (case-insensitive) name match already visible/selected.
  const exactMatch = [...results, ...selected].some((r) => r.name.toLowerCase() === term.toLowerCase());
  const showCreate = !!onCreate && term.length >= 1 && !exactMatch;

  function pick(item: PickerItem) {
    onChange([...selected, item]);
    setQ("");
    setDupCandidates(null);
  }

  async function handleCreate(allowDuplicate = false) {
    if (!onCreate || !term) return;
    setCreating(true);
    try {
      const created = await onCreate(term, { allowDuplicate });
      // The new record now exists live — drop this search cache so every picker of
      // this type (and a re-search of the same term) finds it without a hard refresh.
      qc.invalidateQueries({ queryKey: [fetchKey] });
      pick(created);
    } catch (err) {
      const dup = getDuplicateError(err);
      if (dup) setDupCandidates(dup.candidates);
      else throw err;
    } finally {
      setCreating(false);
    }
  }

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
        onChange={(e) => {
          setQ(e.target.value);
          if (dupCandidates) setDupCandidates(null);
        }}
        placeholder={placeholder}
        className={inputCls}
      />
      {term.length >= 1 && (results.length > 0 || showCreate) && (
        <ul className="border border-gray-200 rounded-md mt-1 divide-y divide-gray-100 bg-white max-h-44 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-violet-50"
              >
                {r.name} <span className="text-xs text-gray-400">#{r.id}</span>
              </button>
            </li>
          ))}
          {showCreate && (
            <li>
              <button
                type="button"
                onClick={() => handleCreate(false)}
                disabled={creating}
                className="w-full text-left px-3 py-2 text-sm text-violet-700 font-medium hover:bg-violet-50 disabled:opacity-50"
              >
                {creating ? "Creating…" : `+ Create “${term}”`}
              </button>
            </li>
          )}
        </ul>
      )}

      {dupCandidates && (
        <div className="mt-1 border border-amber-300 bg-amber-50 rounded-md p-2 text-sm">
          <p className="text-amber-900 mb-1.5">
            A similar name already exists — pick one instead of creating a duplicate:
          </p>
          <ul className="divide-y divide-amber-200 rounded-md border border-amber-200 bg-white mb-1.5">
            {dupCandidates.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pick({ id: c.id, name: c.name })}
                  className="w-full text-left px-3 py-2 text-gray-700 hover:bg-amber-50 flex justify-between items-center"
                >
                  <span>
                    {c.name} <span className="text-xs text-gray-400">#{c.id}</span>
                  </span>
                  <span className="text-xs text-gray-400">{Math.round(c.similarity * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => handleCreate(true)}
            disabled={creating}
            className="text-xs text-amber-800 font-medium hover:underline disabled:opacity-50"
          >
            {creating ? "Creating…" : `None of these — create “${term}” anyway`}
          </button>
        </div>
      )}
    </div>
  );
}
