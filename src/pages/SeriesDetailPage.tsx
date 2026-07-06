import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogue } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import WorkCard from "../components/WorkCard";
import Pagination from "../components/Pagination";

type Sort = "position_asc" | "date_asc" | "title_asc";

const SORT_LABELS: Record<Sort, string> = {
  position_asc: "Series order",
  date_asc: "Publication date",
  title_asc: "Title",
};

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<Sort>("position_asc");

  const { data: series, isLoading } = useQuery({
    queryKey: ["series", id],
    queryFn: () => catalogue.seriesDetail(Number(id)),
    enabled: !!id,
  });

  const { data: worksPage } = useQuery({
    queryKey: ["series-works", id, sort, page],
    queryFn: () => catalogue.seriesWorks(Number(id), { sort, page }),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Loading…</div>;
  }
  if (!series) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Series not found.</div>
    );
  }

  const nativeName = series.localised?.name
    ? Object.values(series.localised.name)[0]
    : undefined;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Series</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{series.name}</h1>
          {nativeName && <p className="text-lg text-gray-600 mb-1">{nativeName}</p>}
          {series.description && (
            <p className="text-sm text-gray-600 leading-relaxed mt-3 max-w-2xl whitespace-pre-line">
              {series.description}
            </p>
          )}
        </div>
        {user && ["admin", "volunteer"].includes(user.role.toLowerCase()) && (
          <Link
            to={isAdmin ? `/admin/edit-series/${series.id}` : `/series/${series.id}/edit`}
            className="shrink-0 text-sm px-3 py-1.5 rounded-md border border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors"
          >
            {isAdmin ? "Edit ✎" : "Suggest an edit ✎"}
          </Link>
        )}
      </div>

      {worksPage && worksPage.items.length > 0 ? (
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Works
              <span className="ml-2 text-sm font-normal text-gray-400">({worksPage.total})</span>
            </h2>
            <label className="text-sm text-gray-500 flex items-center gap-2">
              Sort
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as Sort);
                  setPage(1);
                }}
                className="border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {worksPage.items.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </div>
          <Pagination page={worksPage.page} pages={worksPage.pages} onChange={setPage} />
        </div>
      ) : (
        <p className="text-gray-400 text-sm">No works linked to this series yet.</p>
      )}
    </div>
  );
}
