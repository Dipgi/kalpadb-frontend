import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogue, type AwardTypeItem } from "../lib/api";

/**
 * Public awards directory: every award, expandable to show its results (winners,
 * shortlists…) rolled up across works and people, newest year first.
 */
export default function AwardsPage() {
  const { data: awards, isLoading } = useQuery({
    queryKey: ["award-types-active"],
    queryFn: () => catalogue.awardTypesActive(),
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Awards</h1>
      <p className="text-sm text-gray-500 mb-6">
        Speculative-fiction awards catalogued in KalpaDB. Open one to see its winners and nominees.
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !awards || awards.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No awards catalogued yet.</p>
      ) : (
        <ul className="space-y-3">
          {awards.map((a) => (
            <AwardRow key={a.id} award={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AwardRow({ award }: { award: AwardTypeItem }) {
  const [open, setOpen] = useState(false);

  const { data: results, isLoading } = useQuery({
    queryKey: ["award-results", award.id],
    queryFn: () => catalogue.awardResults(award.id),
    enabled: open,
  });

  return (
    <li className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-violet-50/50 transition-colors"
      >
        <span className="text-gray-400 text-sm w-4">{open ? "▾" : "▸"}</span>
        <span className="font-semibold text-gray-900">{award.name}</span>
        {award.country && <span className="text-xs text-gray-400">{award.country}</span>}
        {award.language && (
          <span className="text-xs text-gray-400 uppercase">· {award.language}</span>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {award.categories.length} categor{award.categories.length === 1 ? "y" : "ies"}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-3">
          {award.notes && <p className="text-xs text-gray-500 mb-3">{award.notes}</p>}
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading results…</p>
          ) : !results || results.length === 0 ? (
            <p className="text-sm text-gray-400">
              No results recorded yet. Categories: {award.categories.map((c) => c.name).join(", ") || "—"}.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {results.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-gray-400 tabular-nums w-10">{r.year}</span>
                  <span className="text-gray-500">{r.category}</span>
                  <span className="text-[11px] uppercase tracking-wide text-violet-600 font-semibold">
                    {r.result}
                  </span>
                  <span className="text-gray-900">
                    {r.lw_id ? (
                      <Link to={`/works/${r.lw_id}`} className="hover:underline">
                        {r.work_title}
                      </Link>
                    ) : r.stakeholder_id ? (
                      <Link to={`/persons/${r.stakeholder_id}`} className="hover:underline">
                        {r.person_name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </span>
                  {r.notes && <span className="text-xs text-gray-400">· {r.notes}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
