import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { works, catalogue } from "../lib/api";
import WorkCard from "../components/WorkCard";
import Pagination from "../components/Pagination";
import { WORK_TYPE_OPTIONS } from "../lib/workTypes";

// Magazines are serial containers with their own index (/magazines), so they're
// intentionally excluded from the general works browse.
const WORK_TYPES = ["BOOK", "STORY", "COMIC", "MEDIA"];

const SORT_OPTIONS = [
  { value: "added_desc", label: "Recently Added" },
  { value: "date_desc", label: "Newest First" },
  { value: "date_asc", label: "Oldest First" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "rating_desc", label: "Top Rated" },
];

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") ?? "";
  const contentType = searchParams.get("content_type") ?? "";
  const lang = searchParams.get("lang") ?? "";
  const genreSlug = searchParams.get("genre_slug") ?? "";
  const tagSlug = searchParams.get("tag_slug") ?? "";
  const sort = searchParams.get("sort") ?? "added_desc";
  const page = Number(searchParams.get("page") ?? 1);

  const { data: genres } = useQuery({ queryKey: ["genres"], queryFn: catalogue.genres });
  const { data: tagTree } = useQuery({ queryKey: ["tag-tree"], queryFn: catalogue.tagTree });
  const { data: languages } = useQuery({ queryKey: ["languages"], queryFn: catalogue.languages });

  const { data: result, isLoading } = useQuery({
    queryKey: ["works", type, contentType, lang, genreSlug, tagSlug, sort, page],
    queryFn: () =>
      works.list({
        type: type || undefined,
        content_type: contentType || undefined,
        lang: lang || undefined,
        genre_slug: genreSlug || undefined,
        tag_slug: tagSlug || undefined,
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

  const hasFilters = !!(type || contentType || lang || genreSlug || tagSlug);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Browse</h1>

      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-3 mb-8">
        <select
          value={type}
          onChange={(e) => set("type", e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All types</option>
          {WORK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <select
          value={contentType}
          onChange={(e) => set("content_type", e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All work types</option>
          {WORK_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

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

        {genres && genres.length > 0 && (
          <select
            value={genreSlug}
            onChange={(e) => set("genre_slug", e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.slug}>
                {g.genre_name}
              </option>
            ))}
          </select>
        )}

        {tagTree && tagTree.length > 0 && (
          <select
            value={tagSlug}
            onChange={(e) => set("tag_slug", e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All tags (subgenres)</option>
            {tagTree.map((parent) => (
              <optgroup key={parent.id} label={parent.tag_name}>
                {(parent.children ?? []).map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.tag_name}
                  </option>
                ))}
              </optgroup>
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
            onClick={() => setSearchParams({ sort })}
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
            {result.total.toLocaleString()} works · page {result.page} of {result.pages}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {result.items.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </div>
          <Pagination page={result.page} pages={result.pages} onChange={setPage} />
        </>
      ) : (
        <p className="text-gray-400 text-center py-16">No works found.</p>
      )}
    </div>
  );
}
