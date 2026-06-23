const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

export const SOURCE_RELATIONS = [
  { value: "", label: "—" },
  { value: "translation", label: "Translation" },
  { value: "transcreation", label: "Transcreation / loose adaptation" },
  { value: "inspired_by", label: "Inspired by" },
];

export interface SourceAttribution {
  original_title: string;
  original_author: string;
  source_relation: string;
}

export function emptySourceAttribution(): SourceAttribution {
  return { original_title: "", original_author: "", source_relation: "" };
}

/**
 * Records a source work that is NOT in the catalogue (e.g. a Bengali
 * transcreation of an American novel). When the source IS catalogued, use the
 * Translations & editions linker instead.
 */
export default function SourceAttributionFields({
  value,
  onChange,
}: {
  value: SourceAttribution;
  onChange: (v: SourceAttribution) => void;
}) {
  function set(patch: Partial<SourceAttribution>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-3 border border-gray-200 rounded-lg p-3 bg-gray-50/50">
      <div>
        <label className={labelCls + " mb-0"}>Based on an external work (not in the catalogue)</label>
        <p className="text-xs text-gray-400 mt-0.5">
          Use this when the original isn’t (and won’t be) a separate record here. If the original{" "}
          <em>is</em> in the catalogue, link it under “Translations &amp; editions” instead.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Relationship</label>
          <select
            value={value.source_relation}
            onChange={(e) => set({ source_relation: e.target.value })}
            className={inputCls}
          >
            {SOURCE_RELATIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Original title</label>
          <input
            value={value.original_title}
            onChange={(e) => set({ original_title: e.target.value })}
            placeholder="e.g. Avarice"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Original author</label>
          <input
            value={value.original_author}
            onChange={(e) => set({ original_author: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}

/** Map the form fields to the API payload (empty strings → null). */
export function sourceAttributionPayload(v: SourceAttribution) {
  return {
    original_title: v.original_title.trim() || null,
    original_author: v.original_author.trim() || null,
    source_relation: v.source_relation || null,
  };
}
