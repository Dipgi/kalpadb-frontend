import { useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { search } from "../lib/api";
import WorkCard from "../components/WorkCard";
import Pagination from "../components/Pagination";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: result, isLoading } = useQuery({
    queryKey: ["search", q, page],
    queryFn: () => search.query(q, page),
    enabled: !!q.trim(),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = inputRef.current?.value.trim() ?? "";
    if (val) setSearchParams({ q: val });
  }

  function setPage(p: number) {
    setSearchParams({ q, page: String(p) });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Search</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8 max-w-lg">
        <input
          ref={inputRef}
          defaultValue={q}
          placeholder="Search works, authors…"
          className="flex-1 border border-gray-200 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          type="submit"
          className="bg-violet-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-violet-800 transition-colors"
        >
          Search
        </button>
      </form>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-gray-100 rounded-lg" />
              <div className="h-3 bg-gray-100 rounded mt-2 w-3/4" />
            </div>
          ))}
        </div>
      ) : result ? (
        result.items.length > 0 ? (
          <>
            <p className="text-sm text-gray-400 mb-4">
              {result.total.toLocaleString()} results for "{q}"
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {result.items.map((w) => (
                <WorkCard key={w.id} work={w} />
              ))}
            </div>
            <Pagination page={result.page} pages={result.pages} onChange={setPage} />
          </>
        ) : (
          <p className="text-gray-400 text-center py-16">No results for "{q}".</p>
        )
      ) : (
        <p className="text-gray-400 text-center py-16">Enter a search term above.</p>
      )}
    </div>
  );
}
