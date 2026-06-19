import type { EditLogEntry, DiffChange } from "../lib/api";

/** Render a value compactly for the diff/payload view. */
function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.map(fmt).join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** A relation/nested field whose old value we don't snapshot has no `from`. */
function isScalarChange(c: DiffChange): boolean {
  return Object.prototype.hasOwnProperty.call(c, "from");
}

/**
 * Before→after view of a submission. UPDATEs render a field-by-field diff
 * (scalars show old→new; relation/nested fields show the new value only).
 * CREATE/DELETE fall back to the raw payload.
 */
export default function EditDiff({ entry }: { entry: EditLogEntry }) {
  const isUpdate = entry.action.toLowerCase() === "update" && entry.diff;

  if (!isUpdate) {
    if (entry.action.toLowerCase() === "delete") {
      return (
        <p className="text-xs text-red-600">
          Requests deletion of {entry.table_name} #{entry.record_id}.
        </p>
      );
    }
    return (
      <pre className="text-xs bg-gray-50 border border-gray-100 rounded p-2 overflow-auto max-h-48">
        {JSON.stringify(entry.payload, null, 2)}
      </pre>
    );
  }

  const fields = Object.entries(entry.diff!);
  return (
    <div className="overflow-hidden rounded border border-gray-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 text-gray-400 text-left">
            <th className="px-2 py-1 font-medium">Field</th>
            <th className="px-2 py-1 font-medium">Before</th>
            <th className="px-2 py-1 font-medium">After</th>
          </tr>
        </thead>
        <tbody>
          {fields.map(([field, change]) => (
            <tr key={field} className="border-t border-gray-100 align-top">
              <td className="px-2 py-1 font-mono text-gray-600 whitespace-nowrap">{field}</td>
              <td className="px-2 py-1 text-gray-400 line-through break-words">
                {isScalarChange(change) ? fmt(change.from) : <span className="italic">changed</span>}
              </td>
              <td className="px-2 py-1 text-gray-800 break-words">{fmt(change.to)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
