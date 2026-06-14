import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogue } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import WorkCard from "../components/WorkCard";
import Pagination from "../components/Pagination";

export default function PublisherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";
  const [page, setPage] = useState(1);

  const { data: publisher, isLoading } = useQuery({
    queryKey: ["publisher", id],
    queryFn: () => catalogue.publisher(Number(id)),
    enabled: !!id,
  });

  const { data: worksPage } = useQuery({
    queryKey: ["publisher-works", id, page],
    queryFn: () => catalogue.publisherWorks(Number(id), page),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Loading…</div>;
  }
  if (!publisher) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Publisher not found.</div>;
  }

  const meta = [
    publisher.city,
    publisher.country,
    publisher.founded_year ? `est. ${publisher.founded_year}` : null,
    publisher.defunct_year ? `closed ${publisher.defunct_year}` : null,
  ].filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{publisher.name}</h1>
          {meta.length > 0 && <p className="text-sm text-gray-500">{meta.join(" · ")}</p>}
          {publisher.website && (
            <a
              href={publisher.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-violet-700 hover:underline"
            >
              Website ↗
            </a>
          )}
          {publisher.description && (
            <p className="text-sm text-gray-600 leading-relaxed mt-3 max-w-2xl">{publisher.description}</p>
          )}
        </div>
        {isAdmin && (
          <Link
            to={`/admin/edit-publisher/${publisher.id}`}
            className="shrink-0 text-sm px-3 py-1.5 rounded-md border border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors"
          >
            Edit ✎
          </Link>
        )}
      </div>

      {worksPage && worksPage.items.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Books
            <span className="ml-2 text-sm font-normal text-gray-400">({worksPage.total})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {worksPage.items.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </div>
          <Pagination page={worksPage.page} pages={worksPage.pages} onChange={setPage} />
        </div>
      ) : (
        <p className="text-gray-400 text-sm">No books linked to this publisher yet.</p>
      )}
    </div>
  );
}
