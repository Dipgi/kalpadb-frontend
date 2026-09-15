import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { works, catalogue } from "../lib/api";
import WorkCard from "../components/WorkCard";
import { useSeo } from "../hooks/useSeo";
import Pagination from "../components/Pagination";
import { contentTypeOptionsFor, workTypeLabel } from "../lib/workTypes";

// Academic articles and coverage items are secondary material about Indian
// SF (scholarship, press coverage/interviews) rather than primary works, so
// — like magazines — they're excluded from the general works browse and get
// their own index here instead.
const TYPES = ["ACADEMIC", "COVERAGE"];

const SORT_OPTIONS = [
  { value: "added_desc", label: "Recently Added" },
  { value: "date_desc", label: "Newest First" },
  { value: "date_asc", label: "Oldest First" },
  { value: "title_asc", label: "Title A–Z" },
];

export default function BrowseCoveragePage() {
  useSeo({
    title: "Scholarship & Coverage",
    description:
      "Academic articles and press coverage & interviews about Indian speculative fiction — scholarship, journal articles, newspaper pieces, and video/text interviews.",
    path: "/coverage",
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") || "ACADEMIC";
  const contentType = searchParams.get("content_type") ?? "";
  const lang = searchParams.get("lang") ?? "";
  const sort = searchParams.get("sort") ?? "added_desc";
  const page = Number(searchParams.get("page") ?? 1);

  const { data: languages } = useQuery({ queryKey: ["languages"], queryFn: catalogue.languages });

  const { data: result, isLoading } = useQuery({
    queryKey: ["coverage-works", type, contentType, lang, sort, page],
    queryFn: () =>
      works.list({
        type,
        content_type: contentType || undefined,
        lang: lang || undefined,
        sort,
        page,
        page_size: 25,
      }),
  });

  function set(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      // Categories differ per type, so switching type clears any category
      // filter that no longer applies (e.g. "thesis" under Coverage).
      if (key === "type") next.delete("content_type");
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

  const contentTypeOptions = contentTypeOptionsFor(type);
  const hasFilters = !!(contentType || lang);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Scholarship & Coverage</h1>
      <p className="text-sm text-gray-500 mb-6">
        Secondary material <em>about</em> Indian speculative fiction — academic scholarship and
        press coverage/interviews — rather than primary works. Look for a “Discussed in” link on a
        book or story’s own page to find coverage of that specific work.
      </p>

      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-3 mb-8">
        <select
          value={type}
          onChange={(e) => set("type", e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {workTypeLabel(t, true)}
            </option>
          ))}
        </select>

        {contentTypeOptions.length > 0 && (
          <select
            value={contentType}
            onChange={(e) => set("content_type", e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All categories</option>
            {contentTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        {languages && languages.length > 0 && (
          <select
            value={lang}
            onChange={(e) => set("lang", e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All languages</option>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        )}

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

        {hasFilters && (
          <button
            onClick={() => setSearchParams({ type, sort })}
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-gray-100 rounded-lg" />
              <div className="h-3 bg-gray-100 rounded mt-2 w-3/4" />
              <div className="h-3 bg-gray-100 rounded mt-1 w-1/2" />
            </div>
          ))}
        </div>
      ) : result && result.items.length > 0 ? (
        <>
          <p className="text-sm text-gray-400 mb-4">
            {result.total.toLocaleString()} items · page {result.page} of {result.pages}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {result.items.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </div>
          <Pagination page={result.page} pages={result.pages} onChange={setPage} />
        </>
      ) : (
        <p className="text-gray-400 text-center py-16">
          Nothing here yet — add one from{" "}
          <Link to="/contribute" className="text-violet-700 hover:underline">
            Contribute
          </Link>
          .
        </p>
      )}
    </div>
  );
}
