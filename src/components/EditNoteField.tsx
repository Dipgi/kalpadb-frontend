const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

/**
 * Optional "note to the reviewer" attached to a volunteer edit submission.
 * Hidden for admins (their edits auto-approve, so there's no reviewer to address).
 */
export default function EditNoteField({
  show,
  value,
  onChange,
}: {
  show: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  if (!show) return null;
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        Note to reviewer <span className="font-normal text-gray-400">(optional)</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Briefly explain your change or cite a source — helps the admin review it."
        className={inputCls}
      />
    </div>
  );
}
