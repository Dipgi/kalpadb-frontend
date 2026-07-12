import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { works, type IssueBrowseItem } from "../lib/api";
import { ISSUE_TYPE_LABELS, issueDisplay } from "../lib/issues";
import Pagination from "../components/Pagination";
import { useSeo } from "../hooks/useSeo";

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest First" },
  { value: "date_asc", label: "Oldest First" },
  { value: "volume_desc", label: "Volume (high→low)" },
  { value: "volume_asc", label: "Volume (low→high)" },
  { value: "added_desc", label: "Recently Added" },
];

/** Show the cover (cover) year, or full date when it isn't a plain Jan-1 stamp. */
function issueDate(d: string | null): string {
  if (!d) return "";
  const year = d.slice(0, 4);
  return /^\d{4}-01-01$/.test(d) ? year : `${year}`;
}

function IssueCard({ issue }: { issue: IssueBrowseItem }) {
  // Issues belong to a magazine; the detail page lives under that magazine.
  const to =
    issue.magazine_id != null
      ? `/magazines/${issue.magazine_id}/issues/${issue.m_issue_id}`
      : "#";
  return (
    <Link
      to={to}
      className="group flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[2/3] bg-gray-50 flex items-center justify-center overflow-hidden">
        {issue.cover_image_url ? (
          <img
            src={issue.cover_image_url}
            alt={`${issue.magazine_title ?? "Magazine"} ${issueDisplay(issue) ?? ""}`}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-1">
          {issue.magazine_title ?? "Untitled magazine"}
        </p>
        <p className="text-xs text-gray-600 leading-snug line-clamp-1">
          {issueDisplay(issue) || "Issue"}
          {issueDate(issue.publication_date) && (
            <span className="text-gray-400"> · {issueDate(issue.publication_date)}</span>
          )}
        </p>
        {issue.issue_type && issue.issue_type !== "regular" && (
          <span className="self-start text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
            {ISSUE_TYPE_LABELS[issue.issue_type]}
          </span>
        )}
        {issue.story_count > 0 && (
          <p className="text-xs text-gray-400">
            {issue.story_count} {issue.story_count === 1 ? "story" : "stories"}
          </p>
        )}
      </div>
    </Link>
  );
}

/**
 * Flat index of every magazine issue across all magazines. Issues are the
 * periodical analogue of book editions — first-class published artifacts that
 * live outside literary_works — so they get their own browse rather than
 * appearing in the general works listing.
 */
export default function BrowseIssuesPage() {
  useSeo({
    title: "Magazine Issues",
    description: "Browse individual issues of Indian speculative fiction magazines.",
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get("sort") ?? "date_desc";
  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? 1);

  // Debounce the search box so we don't fire a request per keystroke.
  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);
  useEffect(() => {
    const id = setTimeout(() => {
      if (term !== q) set("q", term);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const { data: result, isLoading } = useQuery({
    queryKey: ["issues", q, sort, page],
    queryFn: () => works.browseIssues({ q: q || undefined, sort, page, page_size: 25 }),
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
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Magazine Issues</h1>
      <p className="text-sm text-gray-500 mb-6">
        Every catalogued issue across all magazines. Open an issue to see its contents, credits,
        and scans.
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by issue label, theme, or magazine…"
          className="flex-1 min-w-[200px] border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
            {result.total.toLocaleString()} issues · page {result.page} of {result.pages}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {result.items.map((i) => (
              <IssueCard key={i.m_issue_id} issue={i} />
            ))}
          </div>
          <Pagination page={result.page} pages={result.pages} onChange={setPage} />
        </>
      ) : (
        <p className="text-gray-400 text-center py-16">
          {q ? "No issues match your search." : "No issues yet."}
        </p>
      )}
    </div>
  );
}
