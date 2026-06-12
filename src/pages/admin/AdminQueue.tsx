import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, type EditLogEntry } from "../../lib/api";

export default function AdminQueue() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [rejectNote, setRejectNote] = useState<Record<number, string>>({});
  const [rejectOpen, setRejectOpen] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-queue", page],
    queryFn: () => admin.queue.list(page),
  });

  const review = useMutation({
    mutationFn: ({ id, approve, note }: { id: number; approve: boolean; note?: string }) =>
      admin.queue.review(id, approve, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-queue"] });
      setRejectOpen(null);
    },
  });

  const pending = data?.items ?? [];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        Edit Queue
        {data && data.total > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-400">
            {data.total} pending
          </span>
        )}
      </h1>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <p className="text-gray-400 text-center py-16">Queue is empty — nothing to review.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((entry: EditLogEntry) => (
            <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded uppercase text-gray-600">
                      {entry.action}
                    </span>
                    <span className="text-sm font-medium text-gray-800">{entry.table_name}</span>
                    {entry.record_id && (
                      <span className="text-xs text-gray-400">#{entry.record_id}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    by {entry.submitted_by.username} ·{" "}
                    {entry.submitted_at
                      ? new Date(entry.submitted_at).toLocaleString()
                      : "unknown time"}
                  </p>
                  <details className="mt-2">
                    <summary className="text-xs text-violet-600 cursor-pointer hover:underline">
                      View payload
                    </summary>
                    <pre className="mt-1 text-xs bg-gray-50 border border-gray-100 rounded p-2 overflow-auto max-h-40">
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                  </details>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: entry.id, approve: true })}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    disabled={review.isPending}
                    onClick={() => setRejectOpen(rejectOpen === entry.id ? null : entry.id)}
                    className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-60 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {rejectOpen === entry.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    autoFocus
                    placeholder="Reason for rejection (required)"
                    value={rejectNote[entry.id] ?? ""}
                    onChange={(e) =>
                      setRejectNote((p) => ({ ...p, [entry.id]: e.target.value }))
                    }
                    className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <button
                    disabled={!rejectNote[entry.id]?.trim() || review.isPending}
                    onClick={() =>
                      review.mutate({
                        id: entry.id,
                        approve: false,
                        note: rejectNote[entry.id],
                      })
                    }
                    className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60 transition-colors"
                  >
                    Confirm Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">{page} / {data.pages}</span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
