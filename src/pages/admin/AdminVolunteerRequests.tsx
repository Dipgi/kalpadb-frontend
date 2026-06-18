import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, type VolunteerRequest } from "../../lib/api";

type StatusFilter = "pending" | "approved" | "rejected";
const FILTERS: StatusFilter[] = ["pending", "approved", "rejected"];

export default function AdminVolunteerRequests() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [page, setPage] = useState(1);
  // Request awaiting a rejection note: id, or null.
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["volunteer-requests", filter, page],
    queryFn: () => admin.volunteerRequests.list(filter, page),
  });

  const review = useMutation({
    mutationFn: ({ id, approve, reviewer_note }: { id: number; approve: boolean; reviewer_note?: string }) =>
      admin.volunteerRequests.review(id, approve, reviewer_note),
    onSuccess: () => {
      setRejecting(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["volunteer-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-counts"] });
      // A new volunteer changes the user list roles too.
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">
        Volunteer Requests
        {data && <span className="ml-2 text-sm font-normal text-gray-400">{data.total} total</span>}
      </h1>

      <div className="flex gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`text-sm px-4 py-1.5 rounded-md border capitalize transition-colors ${
              filter === f
                ? "bg-violet-700 text-white border-violet-700"
                : "border-gray-300 text-gray-600 hover:border-violet-400"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (data?.items ?? []).length === 0 ? (
        <p className="text-sm text-gray-400">No {filter} requests.</p>
      ) : (
        <div className="space-y-3">
          {(data?.items ?? []).map((r: VolunteerRequest) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">
                    {r.user.username}
                    <span className="ml-1.5 text-xs text-gray-400">#{r.user.id}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                  </p>
                  {r.message && (
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{r.message}</p>
                  )}
                  {r.status !== "pending" && r.reviewer_note && (
                    <p className="text-xs text-gray-500 mt-2 italic">Note: {r.reviewer_note}</p>
                  )}
                </div>

                {r.status === "pending" ? (
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => review.mutate({ id: r.id, approve: true })}
                      disabled={review.isPending}
                      className="text-xs px-3 py-1.5 rounded bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejecting(r.id);
                        setNote("");
                      }}
                      disabled={review.isPending}
                      className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                      r.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {r.status}
                  </span>
                )}
              </div>

              {rejecting === r.id && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note to the requester…"
                    className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 mb-2"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        review.mutate({ id: r.id, approve: false, reviewer_note: note.trim() || undefined })
                      }
                      disabled={review.isPending}
                      className="text-xs px-3 py-1.5 rounded bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {review.isPending ? "Saving…" : "Confirm reject"}
                    </button>
                    <button
                      onClick={() => setRejecting(null)}
                      disabled={review.isPending}
                      className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">
            {page} / {data.pages}
          </span>
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
