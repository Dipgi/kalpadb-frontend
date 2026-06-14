import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { admin, type AuditEntry } from "../../lib/api";

const TARGET_FILTERS = [
  { value: "", label: "All activity" },
  { value: "submission", label: "Submissions (approve/reject)" },
  { value: "work", label: "Works" },
  { value: "person", label: "People" },
  { value: "publisher", label: "Publishers" },
  { value: "series", label: "Series" },
  { value: "review", label: "Reviews" },
  { value: "user", label: "Users" },
  { value: "news", label: "News" },
];

/** Colour an action badge by its outcome keyword. */
function actionStyle(action: string): string {
  if (action.includes("deleted") || action.includes("removed") || action.includes("rejected"))
    return "bg-red-100 text-red-700";
  if (action.includes("approved") || action.includes("created"))
    return "bg-green-100 text-green-700";
  if (action.includes("updated")) return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

function formatAction(action: string) {
  return action.replace(/_/g, " ");
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAudit() {
  const [targetType, setTargetType] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["audit", targetType, page],
    queryFn: () => admin.audit.list({ target_type: targetType || undefined, page }),
  });

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
        <select
          value={targetType}
          onChange={(e) => {
            setTargetType(e.target.value);
            setPage(1);
          }}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {TARGET_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Read-only record of moderation, content changes, reviews and user management. Newest first.
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No activity recorded yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-2 font-semibold">When</th>
                  <th className="px-4 py-2 font-semibold">Who</th>
                  <th className="px-4 py-2 font-semibold">Action</th>
                  <th className="px-4 py-2 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((e: AuditEntry) => (
                  <tr key={e.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {formatTime(e.created_at)}
                    </td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                      {e.actor?.username ?? <span className="text-gray-400">system</span>}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full capitalize ${actionStyle(e.action)}`}
                      >
                        {formatAction(e.action)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {e.summary ?? "—"}
                      {e.target_type && e.target_id != null && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({e.target_type} #{e.target_id})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-sm px-3 py-1 rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-violet-400"
              >
                ← Newer
              </button>
              <span className="text-sm text-gray-400">
                {page} / {data.pages}
              </span>
              <button
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
                className="text-sm px-3 py-1 rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-violet-400"
              >
                Older →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
