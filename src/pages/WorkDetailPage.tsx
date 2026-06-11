import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { works, user } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const SHELF_STATUSES = ["want_to_read", "reading", "read", "dropped"];

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [shelfStatus, setShelfStatus] = useState<string | null>(null);

  const { data: work, isLoading } = useQuery({
    queryKey: ["work", id],
    queryFn: () => works.get(Number(id)),
    enabled: !!id,
  });

  const shelfMutation = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      shelfStatus
        ? user.updateShelf(work!.id, status)
        : user.addToShelf(work!.id, status),
    onSuccess: (_, { status }) => {
      setShelfStatus(status);
      qc.invalidateQueries({ queryKey: ["shelf"] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
        <div className="flex gap-8">
          <div className="w-48 aspect-[2/3] bg-gray-100 rounded-lg shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-7 bg-gray-100 rounded w-2/3" />
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">
        Work not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row gap-8 mb-10">
        {/* Cover */}
        <div className="w-40 md:w-48 shrink-0">
          {work.cover_image_url ? (
            <img
              src={work.cover_image_url}
              alt={work.title}
              className="w-full rounded-lg shadow-md"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{work.title}</h1>
          <p className="text-gray-500 mb-3">
            {work.authors.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <Link to={`/persons/${a.id}`} className="hover:text-violet-700">
                  {a.name}
                </Link>
              </span>
            ))}
            {work.publication_year && <span> · {work.publication_year}</span>}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full capitalize">
              {work.work_type.toLowerCase()}
            </span>
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full uppercase">
              {work.language_code}
            </span>
            {work.genres.map((g) => (
              <span key={g.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                {g.name}
              </span>
            ))}
          </div>

          {work.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-4">{work.description}</p>
          )}

          {me && (
            <div className="flex flex-wrap gap-2">
              {SHELF_STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={shelfMutation.isPending}
                  onClick={() => shelfMutation.mutate({ status: s })}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors capitalize ${
                    shelfStatus === s
                      ? "bg-violet-700 text-white border-violet-700"
                      : "border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-700"
                  }`}
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {work.publishers.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Publishers
            </h3>
            <p className="text-sm text-gray-700">
              {work.publishers.map((p) => p.name).join(", ")}
            </p>
          </div>
        )}

        {work.book && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Details
            </h3>
            <div className="text-sm text-gray-700 space-y-1">
              {work.book.format && <p>Format: {work.book.format}</p>}
              {work.book.page_count && <p>Pages: {work.book.page_count}</p>}
              {work.book.isbn && <p>ISBN: {work.book.isbn}</p>}
            </div>
          </div>
        )}

        {work.awards.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Awards
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {work.awards.map((a, i) => (
                <li key={i}>
                  {a.award_name}
                  {a.year ? ` (${a.year})` : ""} — {a.result}
                </li>
              ))}
            </ul>
          </div>
        )}

        {work.translations.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Translations
            </h3>
            <ul className="text-sm space-y-1">
              {work.translations.map((t) => (
                <li key={t.id}>
                  <Link to={`/works/${t.id}`} className="text-violet-700 hover:underline">
                    {t.title}
                  </Link>
                  <span className="text-gray-400 ml-1 uppercase text-xs">{t.language_code}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {work.external_links.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Links
            </h3>
            <ul className="text-sm space-y-1">
              {work.external_links.map((l, i) => (
                <li key={i}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-700 hover:underline"
                  >
                    {l.link_type}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
