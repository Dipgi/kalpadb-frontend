import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, getConflictError, type EditLogEntry, type EditConflict } from "../../lib/api";
import EditDiff from "../../components/EditDiff";

export default function AdminQueue() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [rejectNote, setRejectNote] = useState<Record<number, string>>({});
  const [rejectOpen, setRejectOpen] = useState<number | null>(null);
  // edit_id → conflicting fields, surfaced when a clean approve is blocked by drift.
  const [conflicts, setConflicts] = useState<Record<number, EditConflict[]>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-queue", page],
    queryFn: () => admin.queue.list(page),
  });

  const review = useMutation({
    mutationFn: ({
      id,
      approve,
      note,
      force,
    }: {
      id: number;
      approve: boolean;
      note?: string;
      force?: boolean;
    }) => admin.queue.review(id, approve, note, force),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-queue"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-counts"] });
      setRejectOpen(null);
      setConflicts((c) => {
        const next = { ...c };
        delete next[vars.id];
        return next;
      });
    },
    onError: (err, vars) => {
      const conflict = getConflictError(err);
      if (conflict) setConflicts((c) => ({ ...c, [vars.id]: conflict.conflicts }));
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
                  {entry.duplicate_candidates && entry.duplicate_candidates.length > 0 && (
                    <div className="mt-2 bg-amber-50 border border-amber-300 rounded-md px-3 py-2 text-xs">
                      <p className="text-amber-900 font-medium mb-1">
                        ⚠ A similar {entry.table_name === "publishers" ? "publisher" : "person"} may
                        already exist — check before approving:
                      </p>
                      <ul className="space-y-0.5">
                        {entry.duplicate_candidates.map((c) => (
                          <li key={c.id} className="flex items-center gap-2">
                            <a
                              href={`/${entry.table_name === "publishers" ? "publishers" : "persons"}/${c.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-700 hover:underline"
                            >
                              {c.name} <span className="text-gray-400">#{c.id}</span>
                            </a>
                            <span className="text-gray-400">{Math.round(c.similarity * 100)}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {entry.submitter_note && (
                    <p className="mt-2 text-xs text-gray-600">
                      <span className="font-semibold text-gray-500">Contributor note:</span>{" "}
                      {entry.submitter_note}
                    </p>
                  )}
                  <details className="mt-2" open={entry.action.toLowerCase() === "update"}>
                    <summary className="text-xs text-violet-600 cursor-pointer hover:underline">
                      {entry.action.toLowerCase() === "update" ? "View changes" : "View details"}
                    </summary>
                    <div className="mt-1">
                      <EditDiff entry={entry} />
                    </div>
                  </details>

                  {conflicts[entry.id] && conflicts[entry.id].length > 0 && (
                    <div className="mt-2 bg-amber-50 border border-amber-300 rounded-md px-3 py-2 text-xs">
                      <p className="text-amber-900 font-medium mb-1">
                        ⚠ This record changed since the edit was submitted — approving will overwrite
                        the newer values:
                      </p>
                      <ul className="space-y-0.5 text-amber-900">
                        {conflicts[entry.id].map((c) => (
                          <li key={c.field}>
                            <span className="font-mono">{c.field}</span>: now{" "}
                            <span className="font-medium">{String(c.current ?? "—")}</span> (edit was
                            based on <span className="line-through">{String(c.base ?? "—")}</span>)
                          </li>
                        ))}
                      </ul>
                      <button
                        disabled={review.isPending}
                        onClick={() =>
                          review.mutate({ id: entry.id, approve: true, force: true })
                        }
                        className="mt-2 text-xs px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-60 transition-colors"
                      >
                        Approve anyway (overwrite)
                      </button>
                    </div>
                  )}
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
