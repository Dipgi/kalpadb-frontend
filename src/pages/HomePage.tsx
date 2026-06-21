import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { stats, works, news } from "../lib/api";
import WorkCard from "../components/WorkCard";

export default function HomePage() {
  const { data: siteStats } = useQuery({ queryKey: ["stats"], queryFn: stats.get });
  const { data: recent } = useQuery({
    queryKey: ["recent-works"],
    queryFn: () => works.list({ page_size: 8 }),
  });
  const { data: newsFeed } = useQuery({
    queryKey: ["news"],
    queryFn: () => news.list(1, 3),
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Indian Speculative Fiction Database
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          A community-curated catalogue of speculative fiction — science fiction, fantasy,
          horror and more — across Indian languages and media.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/browse"
            className="bg-violet-700 text-white px-5 py-2.5 rounded-md font-medium hover:bg-violet-800 transition-colors"
          >
            Browse Catalogue
          </Link>
          <Link
            to="/search"
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-md font-medium hover:bg-gray-50 transition-colors"
          >
            Search
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      {siteStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Works", value: siteStats.stats.total_works, to: "/browse" },
            { label: "Authors", value: siteStats.stats.total_authors, to: "/persons" },
            { label: "Publishers", value: siteStats.stats.total_publishers, to: "/publishers" },
            { label: "Languages", value: siteStats.stats.total_languages, to: "/browse" },
          ].map(({ label, value, to }) => (
            <Link
              key={label}
              to={to}
              className="text-center bg-violet-50 rounded-lg py-4 block transition-colors hover:bg-violet-100"
            >
              <p className="text-2xl font-bold text-violet-700">
                {value?.toLocaleString() ?? "—"}
              </p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Recent works */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recently Added</h2>
          <Link to="/browse" className="text-sm text-violet-700 hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {recent?.items.map((w) => <WorkCard key={w.id} work={w} />)}
        </div>
      </div>

      {/* News */}
      {newsFeed && newsFeed.items.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">News</h2>
          <div className="flex flex-col gap-4">
            {newsFeed.items.map((item) => (
              <Link
                key={item.id}
                to={`/news/${item.slug}`}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow block"
              >
                <p className="font-medium text-gray-900">{item.title}</p>
                {item.summary && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {item.published_at ? new Date(item.published_at).toLocaleDateString() : ""}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
