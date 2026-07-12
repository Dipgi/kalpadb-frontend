import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { news } from "../lib/api";
import Pagination from "../components/Pagination";
import { useSeo } from "../hooks/useSeo";

export default function NewsListPage() {
  useSeo({
    title: "News",
    description: "News and announcements from KalpaDB, the Indian Speculative Fiction Database.",
  });
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["news", "list", page],
    queryFn: () => news.list(page, 10),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">News</h1>

      {isLoading && (
        <div className="flex flex-col gap-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-4">
              <div className="h-5 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-center text-gray-400 py-12">Could not load news. Try again later.</p>
      )}

      {data && data.items.length === 0 && (
        <p className="text-center text-gray-400 py-12">No news yet.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          {data.items.map((item) => (
            <Link
              key={item.id}
              to={`/news/${item.slug}`}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow block"
            >
              <p className="font-medium text-gray-900">
                {item.pinned && (
                  <span className="text-[10px] uppercase tracking-wide bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 mr-2 align-middle">
                    Pinned
                  </span>
                )}
                {item.title}
              </p>
              {item.summary && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {item.published_at
                  ? new Date(item.published_at).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : ""}
              </p>
            </Link>
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}
