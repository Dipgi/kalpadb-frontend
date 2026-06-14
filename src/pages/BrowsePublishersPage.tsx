import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogue } from "../lib/api";
import Pagination from "../components/Pagination";

export default function BrowsePublishersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? 1);

  const { data: result, isLoading } = useQuery({
    queryKey: ["publishers-list", q, page],
    queryFn: () => catalogue.publishersList({ q: q || undefined, page }),
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Publishers</h1>

      <div className="mb-8">
        <input
          defaultValue={q}
          key={q}
          placeholder="Search publishers…"
          onKeyDown={(e) => {
            if (e.key === "Enter") set("q", (e.target as HTMLInputElement).value.trim());
          }}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : result && result.items.length > 0 ? (
        <>
          <p className="text-sm text-gray-400 mb-4">
            {result.total.toLocaleString()} publishers · page {result.page} of {result.pages}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.items.map((p) => (
              <Link
                key={p.id}
                to={`/publishers/${p.id}`}
                className="border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow bg-white"
              >
                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                {(p.city || p.country) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[p.city, p.country].filter(Boolean).join(", ")}
                  </p>
                )}
              </Link>
            ))}
          </div>
          <Pagination page={result.page} pages={result.pages} onChange={setPage} />
        </>
      ) : (
        <p className="text-gray-400 text-center py-16">No publishers found.</p>
      )}
    </div>
  );
}
