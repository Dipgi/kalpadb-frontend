import type { ReactNode } from "react";

/**
 * A titled card that groups related form fields, so long forms read as a few
 * clear sections rather than one dense column.
 */
export default function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-gray-200 rounded-lg bg-white p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
