import { useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { search } from "../lib/api";
import WorkCard from "../components/WorkCard";

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

  const hasWorks = (result?.works?.length ?? 0) > 0;
  const hasPersons = (result?.persons?.length ?? 0) > 0;
  const hasPublishers = (result?.publishers?.length ?? 0) > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Search</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8 max-w-lg">
        <input
          ref={inputRef}
          defaultValue={q}
          placeholder="Search works, people, publishers…"
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
        result.total === 0 ? (
          <p className="text-gray-400 text-center py-16">No results for "{q}".</p>
        ) : (
          <div className="space-y-10">
            <p className="text-sm text-gray-400">{result.total} results for "{q}"</p>

            {hasWorks && (
              <div>
                <h2 className="text-base font-semibold text-gray-700 mb-4">
                  Works <span className="text-gray-400 font-normal">({result.works.length})</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {result.works.map((w) => (
                    <WorkCard key={w.id} work={w} />
                  ))}
                </div>
              </div>
            )}

            {hasPersons && (
              <div>
                <h2 className="text-base font-semibold text-gray-700 mb-4">
                  People <span className="text-gray-400 font-normal">({result.persons.length})</span>
                </h2>
                <div className="flex flex-wrap gap-3">
                  {result.persons.map((p) => (
                    <Link
                      key={p.id}
                      to={`/persons/${p.id}`}
                      className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow bg-white"
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      <span className="text-sm text-gray-900">{p.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {hasPublishers && (
              <div>
                <h2 className="text-base font-semibold text-gray-700 mb-4">
                  Publishers <span className="text-gray-400 font-normal">({result.publishers.length})</span>
                </h2>
                <div className="flex flex-wrap gap-3">
                  {result.publishers.map((p) => (
                    <Link
                      key={p.id}
                      to={`/publishers/${p.id}`}
                      className="border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow bg-white"
                    >
                      <span className="text-sm text-gray-900">{p.name}</span>
                      {(p.city || p.country) && (
                        <span className="block text-xs text-gray-400 mt-0.5">
                          {[p.city, p.country].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <p className="text-gray-400 text-center py-16">Enter a search term above.</p>
      )}
    </div>
  );
}
