import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { volunteer, type EditLogEntry } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import ContributorGate from "../components/ContributorGate";
import EditDiff from "../components/EditDiff";

type StatusFilter = "all" | "pending" | "approved" | "rejected";
const TABS: StatusFilter[] = ["all", "pending", "approved", "rejected"];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

/** Public path for an approved record, so contributors can view what they changed. */
function recordPath(tableName: string, id: number | null): string | null {
  if (!id) return null;
  if (tableName === "book" || tableName === "stories" || tableName === "comic_detail") {
    return `/works/${id}`;
  }
  if (tableName === "stakeholders") return `/persons/${id}`;
  if (tableName === "publishers") return `/publishers/${id}`;
  return null;
}

export default function MySubmissionsPage() {
  return (
    <ContributorGate>
      <Submissions />
    </ContributorGate>
  );
}

function Submissions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["my-submissions", tab, page],
    queryFn: () => volunteer.mySubmissions(tab === "all" ? undefined : tab, page),
  });

  const withdraw = useMutation({
    mutationFn: (id: number) => volunteer.withdrawSubmission(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-submissions"] }),
  });

  const items = data?.items ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
        My submissions
        {user?.auto_approve && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold uppercase tracking-wide"
            title="Your contributions publish immediately, without admin review"
          >
            Trusted volunteer
          </span>
        )}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {user?.auto_approve
          ? "Edits and additions you've made. As a trusted volunteer, they publish immediately."
          : "Edits and additions you've proposed. Nothing goes live until an admin approves it."}
      </p>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
            className={`px-3 py-2 text-sm capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-violet-600 text-violet-700 font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-center py-16">
          {tab === "all" ? "You haven't submitted anything yet." : `No ${tab} submissions.`}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((entry: EditLogEntry) => {
            const path = entry.status === "approved" ? recordPath(entry.table_name, entry.record_id) : null;
            return (
              <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded uppercase text-gray-600">
                      {entry.action}
                    </span>
                    <span className="text-sm font-medium text-gray-800">{entry.table_name}</span>
                    {entry.record_id && (
                      <span className="text-xs text-gray-400">#{entry.record_id}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 ${
                      STATUS_STYLE[entry.status] ?? "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mb-2">
                  {entry.submitted_at ? new Date(entry.submitted_at).toLocaleString() : "—"}
                  {path && (
                    <>
                      {" · "}
                      <a href={path} className="text-violet-600 hover:underline">
                        view live record →
                      </a>
                    </>
                  )}
                </p>

                {entry.submitter_note && (
                  <p className="text-xs text-gray-600 mb-2">
                    <span className="font-semibold text-gray-500">Your note:</span>{" "}
                    {entry.submitter_note}
                  </p>
                )}

                {entry.status === "rejected" && entry.reviewer_note && (
                  <div className="mb-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-700">
                    <span className="font-semibold">Reviewer:</span> {entry.reviewer_note}
                  </div>
                )}

                <EditDiff entry={entry} />

                {entry.status === "pending" && (
                  <div className="mt-3 text-right">
                    <button
                      disabled={withdraw.isPending}
                      onClick={() => withdraw.mutate(entry.id)}
                      className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-60 transition-colors"
                    >
                      Withdraw
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
