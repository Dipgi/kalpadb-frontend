import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogue } from "../lib/api";
import { formatRole } from "../lib/roles";
import { useAuth } from "../hooks/useAuth";
import WorkCard from "../components/WorkCard";
import Pagination from "../components/Pagination";
import { useState } from "react";

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";
  const [page, setPage] = useState(1);

  const { data: person, isLoading } = useQuery({
    queryKey: ["person", id],
    queryFn: () => catalogue.person(Number(id)),
    enabled: !!id,
  });

  const { data: worksPage } = useQuery({
    queryKey: ["person-works", id, page],
    queryFn: () => catalogue.personWorks(Number(id), page),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
        <div className="flex gap-6">
          <div className="w-28 h-28 bg-gray-100 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-6 bg-gray-100 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-1/4" />
            <div className="h-4 bg-gray-100 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">
        Person not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        {person.image_url ? (
          <img
            src={person.image_url}
            alt={person.name}
            className="w-28 h-28 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-violet-100 flex items-center justify-center text-violet-400 shrink-0">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{person.name}</h1>
            {isAdmin && (
              <Link
                to={`/admin/edit-person/${person.id}`}
                className="shrink-0 text-sm px-3 py-1.5 rounded-md border border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors"
              >
                Edit ✎
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
            {person.nationality && <span>{person.nationality}</span>}
            {person.birth_date && (
              <span>b. {person.birth_date.slice(0, 4)}</span>
            )}
            {/* Fall back to the role_type hint only when there are no real credits yet. */}
            {person.roles.length === 0 && person.role_type && (
              <span className="capitalize">{person.role_type}</span>
            )}
          </div>

          {person.roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {person.roles.map((r) => (
                <span
                  key={r}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700"
                >
                  {formatRole(r)}
                </span>
              ))}
            </div>
          )}

          {person.aliases.length > 0 && (
            <p className="text-sm text-gray-400 mb-3">
              Also known as: {person.aliases.map((a) => a.alias).join(", ")}
            </p>
          )}

          {person.bio && (
            <p className="text-sm text-gray-600 leading-relaxed">{person.bio}</p>
          )}

          {person.external_links.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {person.external_links.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-700 hover:underline"
                >
                  {l.link_type}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Works */}
      {worksPage && worksPage.items.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Works
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({worksPage.total})
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {worksPage.items.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </div>
          <Pagination page={worksPage.page} pages={worksPage.pages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
