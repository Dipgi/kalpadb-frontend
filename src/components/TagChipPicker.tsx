import { useQuery } from "@tanstack/react-query";
import { catalogue } from "../lib/api";

const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

/**
 * Tag (subgenre) chips grouped under their parent tags, mirroring the admin
 * tagging workflow: parents act as group labels, children are the selectable
 * chips. A childless parent stays selectable under "Other".
 */
export default function TagChipPicker({
  selected,
  onChange,
}: {
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
}) {
  const { data: tree } = useQuery({ queryKey: ["tag-tree"], queryFn: catalogue.tagTree });
  if (!tree || tree.length === 0) return null;

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  const chip = (id: number, name: string) => (
    <button
      key={id}
      type="button"
      onClick={() => toggle(id)}
      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
        selected.has(id)
          ? "bg-violet-700 text-white border-violet-700"
          : "bg-white border-gray-300 text-gray-600 hover:border-violet-400"
      }`}
    >
      {name}
    </button>
  );

  const withChildren = tree.filter((p) => (p.children ?? []).length > 0);
  const childless = tree.filter((p) => (p.children ?? []).length === 0);

  return (
    <div>
      <label className={labelCls}>Tags</label>
      <div className="space-y-1.5">
        {withChildren.map((parent) => (
          <div key={parent.id} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-gray-400 mr-1 shrink-0">{parent.tag_name}:</span>
            {(parent.children ?? []).map((t) => chip(t.id, t.tag_name))}
          </div>
        ))}
        {childless.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {withChildren.length > 0 && (
              <span className="text-[11px] text-gray-400 mr-1 shrink-0">Other:</span>
            )}
            {childless.map((p) => chip(p.id, p.tag_name))}
          </div>
        )}
      </div>
    </div>
  );
}
