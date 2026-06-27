import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { works, search, catalogue, admin, type GenreItem, type WorkSummary } from "../../lib/api";

export default function AdminTagging() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const searching = q.trim().length >= 2;

  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["tagging-works", page],
    queryFn: () => works.list({ sort: "title_asc", page, page_size: 25 }),
    enabled: !searching,
  });

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["tagging-search", q],
    queryFn: () => search.query(q.trim()),
    enabled: searching,
  });

  const items: WorkSummary[] = searching ? (searchData?.works ?? []) : (listData?.items ?? []);
  const isLoading = searching ? searchLoading : listLoading;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        Genre Tagging
        {!searching && listData && (
          <span className="ml-2 text-sm font-normal text-gray-400">{listData.total} works</span>
        )}
      </h1>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search works by title or author…"
        className="w-full max-w-md border border-gray-200 rounded-md px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No works found.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {items.map((w) => (
            <div key={w.id}>
              <button
                onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
              >
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800">{w.title}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {w.authors[0]?.name}
                    {w.publication_date && ` · ${w.publication_date.slice(0, 4)}`}
                    {" · "}#{w.id}
                  </span>
                </span>
                <span className="text-gray-300 text-sm shrink-0">
                  {expandedId === w.id ? "▲" : "▼"}
                </span>
              </button>
              {expandedId === w.id && allGenres && (
                <GenreEditor workId={w.id} allGenres={allGenres} />
              )}
            </div>
          ))}
        </div>
      )}

      {!searching && listData && listData.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => { setPage((p) => p - 1); setExpandedId(null); }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">{page} / {listData.pages}</span>
          <button
            disabled={page >= listData.pages}
            onClick={() => { setPage((p) => p + 1); setExpandedId(null); }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function GenreEditor({ workId, allGenres }: { workId: number; allGenres: GenreItem[] }) {
  const { data: work, isLoading } = useQuery({
    queryKey: ["work", String(workId)],
    queryFn: () => works.get(workId),
  });

  if (isLoading || !work) {
    return <div className="px-4 py-3 bg-gray-50 text-sm text-gray-400">Loading genres…</div>;
  }
  return (
    <GenreChecklist
      workId={workId}
      workType={work.type}
      allGenres={allGenres}
      initialIds={work.genres.map((g) => g.id)}
    />
  );
}

function GenreChecklist({
  workId,
  workType,
  allGenres,
  initialIds,
}: {
  workId: number;
  workType: string;
  allGenres: GenreItem[];
  initialIds: number[];
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initialIds));
  const [saved, setSaved] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => admin.works.setGenres(workId, [...selected]),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["work", String(workId)] });
      qc.invalidateQueries({ queryKey: ["genres"] });
    },
  });

  function toggle(id: number) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const dirty =
    selected.size !== initialIds.length || initialIds.some((id) => !selected.has(id));

  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
      <div className="flex flex-wrap gap-2 mb-3">
        {allGenres.map((g) => (
          <button
            key={g.id}
            onClick={() => toggle(g.id)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              selected.has(g.id)
                ? "bg-violet-700 text-white border-violet-700"
                : "bg-white border-gray-300 text-gray-600 hover:border-violet-400"
            }`}
          >
            {g.genre_name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || (!dirty && !saveMutation.isError)}
          className="text-xs px-3 py-1.5 rounded-md bg-violet-700 text-white disabled:opacity-40 hover:bg-violet-800 transition-colors"
        >
          {saveMutation.isPending ? "Saving…" : "Save genres"}
        </button>
        {saved && !dirty && <span className="text-xs text-green-600">Saved ✓</span>}
        {saveMutation.isError && (
          <span className="text-xs text-red-500">Save failed — try again.</span>
        )}
        <Link
          to={
            workType === "STORY"
              ? `/admin/edit-story/${workId}`
              : workType === "MAGAZINE"
                ? `/admin/edit-magazine/${workId}`
                : `/admin/edit/${workId}`
          }
          className="text-xs text-violet-600 hover:underline ml-auto"
        >
          {workType === "STORY" ? "Edit story ✎" : workType === "MAGAZINE" ? "Edit magazine ✎" : "Edit book ✎"}
        </Link>
        <Link
          to={`/works/${workId}`}
          target="_blank"
          className="text-xs text-violet-600 hover:underline"
        >
          View work ↗
        </Link>
      </div>
    </div>
  );
}
