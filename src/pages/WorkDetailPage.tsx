import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { works, user } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const SHELF_STATUSES: { value: string; label: string }[] = [
  { value: "want", label: "Want to Read" },
  { value: "in_progress", label: "Reading" },
  { value: "finished", label: "Read" },
  { value: "abandoned", label: "Dropped" },
];

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
      user.upsertShelf(work!.id, status),
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

  const coverUrl =
    work.image_urls?.[0] ??
    work.book?.formats?.[0]?.cover_image_url ??
    null;

  const publicationYear = work.book?.publication_year
    ?? (work.publication_date ? work.publication_date.slice(0, 4) : null);

  const publishers = work.book?.publishers ?? [];
  const firstFormat = work.book?.formats?.[0] ?? null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row gap-8 mb-10">
        {/* Cover */}
        <div className="w-40 md:w-48 shrink-0">
          {coverUrl ? (
            <img src={coverUrl} alt={work.title} className="w-full rounded-lg shadow-md" />
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
                <Link to={`/persons/${a.id}`} className="hover:text-violet-700">{a.name}</Link>
              </span>
            ))}
            {publicationYear && <span> · {publicationYear}</span>}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full capitalize">
              {work.type.toLowerCase()}
            </span>
            {work.language && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full uppercase">
                {work.language}
              </span>
            )}
            {work.genres?.map((g) => (
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
              {SHELF_STATUSES.map(({ value, label }) => (
                <button
                  key={value}
                  disabled={shelfMutation.isPending}
                  onClick={() => shelfMutation.mutate({ status: value })}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    shelfStatus === value
                      ? "bg-violet-700 text-white border-violet-700"
                      : "border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {publishers.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Publishers</h3>
            <p className="text-sm text-gray-700">{publishers.map((p) => p.name).join(", ")}</p>
          </div>
        )}

        {firstFormat && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Details</h3>
            <div className="text-sm text-gray-700 space-y-1">
              {firstFormat.format_type && <p>Format: {firstFormat.format_type}</p>}
              {firstFormat.page_count && <p>Pages: {firstFormat.page_count}</p>}
              {firstFormat.isbn && <p>ISBN: {firstFormat.isbn}</p>}
            </div>
          </div>
        )}

        {work.book?.translators && work.book.translators.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Translators</h3>
            <p className="text-sm text-gray-700">
              {work.book.translators.map((t) => t.name).join(", ")}
            </p>
          </div>
        )}

        {work.awards?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Awards</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {work.awards.map((a) => (
                <li key={a.id}>
                  {a.category.name} ({a.year}) — {a.result}
                </li>
              ))}
            </ul>
          </div>
        )}

        {work.related_works?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Related Works</h3>
            <ul className="text-sm space-y-1">
              {work.related_works.map((r) => (
                <li key={r.id}>
                  <Link to={`/works/${r.work.id}`} className="text-violet-700 hover:underline">
                    {r.work.title}
                  </Link>
                  {r.work.language && (
                    <span className="text-gray-400 ml-1 uppercase text-xs">{r.work.language}</span>
                  )}
                  <span className="text-gray-400 ml-1 text-xs">({r.relation_type})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {work.external_links?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Links</h3>
            <ul className="text-sm space-y-1">
              {work.external_links.map((l) => (
                <li key={l.id}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer"
                    className="text-violet-700 hover:underline">
                    {l.label ?? l.link_type}
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
