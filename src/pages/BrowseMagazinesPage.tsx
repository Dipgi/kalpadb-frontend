import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { works } from "../lib/api";
import WorkCard from "../components/WorkCard";
import Pagination from "../components/Pagination";

const SORT_OPTIONS = [
  { value: "title_asc", label: "Title A–Z" },
  { value: "added_desc", label: "Recently Added" },
  { value: "date_desc", label: "Newest First" },
  { value: "date_asc", label: "Oldest First" },
];

/**
 * Magazines index — magazine titles are serial containers (not browseable as
 * works), so they live here rather than in the general works browse. Each card
 * links to the magazine's page, which lists its issues chronologically.
 */
export default function BrowseMagazinesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get("sort") ?? "title_asc";
  const page = Number(searchParams.get("page") ?? 1);

  const { data: result, isLoading } = useQuery({
    queryKey: ["magazines", sort, page],
    queryFn: () => works.list({ type: "MAGAZINE", sort, page, page_size: 25 }),
  });

  function set(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      return next;
    });
  }

  function setPage(p: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(p));
      return next;
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Magazines</h1>
      <p className="text-sm text-gray-500 mb-6">
        Periodical titles that published speculative fiction. Open a magazine to browse its issues
        and their contents.
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <select
          value={sort}
          onChange={(e) => set("sort", e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-gray-100 rounded-lg" />
              <div className="h-3 bg-gray-100 rounded mt-2 w-3/4" />
            </div>
          ))}
        </div>
      ) : result && result.items.length > 0 ? (
        <>
          <p className="text-sm text-gray-400 mb-4">
            {result.total.toLocaleString()} magazines · page {result.page} of {result.pages}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {result.items.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </div>
          <Pagination page={result.page} pages={result.pages} onChange={setPage} />
        </>
      ) : (
        <p className="text-gray-400 text-center py-16">No magazines yet.</p>
      )}
    </div>
  );
}
