import type { ClearedField } from "../lib/clearedFields";

/**
 * Shown to an admin on save when one or more fields have been emptied. Lists each
 * cleared field with its previous value so the admin can confirm the removal
 * (admin blanks clear the field; this is the safety check before it happens).
 */
export default function ClearedFieldsPrompt({
  fields,
  onConfirm,
  onCancel,
  busy,
}: {
  fields: ClearedField[];
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div className="bg-amber-50 border border-amber-300 text-amber-900 text-sm rounded-md px-4 py-3 mb-4 space-y-3">
      <p className="font-medium">
        You are about to clear {fields.length} field{fields.length > 1 ? "s" : ""}. This removes the
        current value{fields.length > 1 ? "s" : ""}:
      </p>
      <ul className="divide-y divide-amber-200 rounded-md border border-amber-200 bg-white">
        {fields.map((f) => (
          <li key={f.label} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="font-medium">{f.label}</span>
            <span className="text-xs text-gray-500">
              was <span className="text-gray-700">{f.previous}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="bg-amber-600 text-white text-xs px-3 py-1.5 rounded-md font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Clear and save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="text-xs text-amber-800 hover:underline disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
