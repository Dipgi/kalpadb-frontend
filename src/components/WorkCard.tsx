import { Link } from "react-router-dom";
import type { WorkSummary } from "../lib/api";
import { romanisedTitle } from "../lib/title";

export default function WorkCard({ work }: { work: WorkSummary }) {
  const author = work.authors[0]?.name ?? "Unknown";
  const moreAuthors = work.authors.length > 1 ? ` +${work.authors.length - 1}` : "";
  const year = work.publication_date ? work.publication_date.slice(0, 4) : null;
  const roman = romanisedTitle(work.localised, work.title, work.language);

  return (
    <Link
      to={`/works/${work.id}`}
      className="group flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[2/3] bg-gray-100 flex items-center justify-center text-gray-300 overflow-hidden">
        {work.cover_image_url ? (
          <img
            src={work.cover_image_url}
            alt={work.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
          {work.title}
        </p>
        {roman && (
          <p className="text-xs text-gray-400 italic leading-snug line-clamp-1">{roman}</p>
        )}
        {/* Magazines are titles, not authored works — no author line. */}
        {work.type !== "MAGAZINE" && (
          <p className="text-xs text-gray-500">
            {author}{moreAuthors}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {work.avg_rating != null && work.rating_count > 0 && (
            <span className="text-xs text-amber-500 font-medium">
              ★ {work.avg_rating.toFixed(1)}
            </span>
          )}
          {work.language && (
            <span className="text-xs text-gray-400 uppercase">{work.language}</span>
          )}
          {year && <span className="text-xs text-gray-400">{year}</span>}
          <span className="text-xs text-violet-500 capitalize ml-auto">
            {work.type.toLowerCase()}
          </span>
        </div>
      </div>
    </Link>
  );
}
