import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stats, admin } from "../../lib/api";

export default function AdminDashboard() {
  const qc = useQueryClient();
  const { data: siteStats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: stats.get,
  });

  const refresh = useMutation({
    mutationFn: admin.refreshStats,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stats"] }),
  });

  const s = siteStats?.stats ?? {};
  const refreshed = siteStats?.refreshed_at
    ? new Date(siteStats.refreshed_at).toLocaleString()
    : "Never";

  const STAT_CARDS = [
    { label: "Works", value: s.total_works },
    { label: "Authors", value: s.total_authors },
    { label: "Books", value: s.total_books },
    { label: "Publishers", value: s.total_publishers },
    { label: "Languages", value: s.total_languages },
    { label: "Users", value: s.total_users },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Last refreshed: {refreshed}</span>
          <button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="text-sm bg-violet-700 text-white px-4 py-1.5 rounded-md hover:bg-violet-800 disabled:opacity-60 transition-colors"
          >
            {refresh.isPending ? "Refreshing…" : "Refresh Stats"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {STAT_CARDS.map(({ label, value }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-900">
                {value?.toLocaleString() ?? "—"}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
