import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogue, type WorkSummary } from "../lib/api";
import { formatRole } from "../lib/roles";
import { useAuth } from "../hooks/useAuth";
import WorkCard from "../components/WorkCard";
import { useSeo } from "../hooks/useSeo";

// Work-type sections, in display order. A person's credits collapse to whole
// works, so magazine issues surface as their parent MAGAZINE title (there is no
// standalone "issue" work type to group on).
const WORK_CATEGORIES: { type: string; label: string }[] = [
  { type: "BOOK", label: "Books" },
  { type: "STORY", label: "Short Stories" },
  { type: "MAGAZINE", label: "Magazines" },
  { type: "COMIC", label: "Comics" },
  { type: "MEDIA", label: "Screen & Audio" },
];

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";

  const { data: person, isLoading } = useQuery({
    queryKey: ["person", id],
    queryFn: () => catalogue.person(Number(id)),
    enabled: !!id,
  });

  // Fetch every credited work (looping pages) so categories aren't fragmented
  // across pagination. Almost everyone fits in a single 100-item page.
  const { data: allWorks } = useQuery({
    queryKey: ["person-works-all", id],
    queryFn: async () => {
      const acc: WorkSummary[] = [];
      let page = 1;
      for (;;) {
        const res = await catalogue.personWorks(Number(id), page, 100);
        acc.push(...res.items);
        if (page >= res.pages || res.items.length === 0) break;
        page += 1;
      }
      return acc;
    },
    enabled: !!id,
  });

  const { data: awards } = useQuery({
    queryKey: ["person-awards", id],
    queryFn: () => catalogue.personAwards(Number(id)),
    enabled: !!id,
  });

  useSeo({
    title: person?.name,
    description:
      person?.bio ??
      (person
        ? `${person.name}${person.nationality ? `, ${person.nationality}` : ""} — works catalogued in KalpaDB, the Indian Speculative Fiction Database.`
        : undefined),
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
            {user && ["admin", "volunteer"].includes(user.role.toLowerCase()) && (
              <Link
                to={isAdmin ? `/admin/edit-person/${person.id}` : `/persons/${person.id}/edit`}
                className="shrink-0 text-sm px-3 py-1.5 rounded-md border border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors"
              >
                {isAdmin ? "Edit ✎" : "Suggest an edit ✎"}
              </Link>
            )}
          </div>

          {person.primary_language && person.localised?.name?.[person.primary_language] && (
            <p className="text-lg text-gray-600 mb-1" lang={person.primary_language}>
              {person.localised.name[person.primary_language]}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
            {person.nationality && <span>{person.nationality}</span>}
            {(person.birth_date || person.end_date) && (
              <span>
                {person.birth_date && person.end_date
                  ? `${person.birth_date.slice(0, 4)}–${person.end_date.slice(0, 4)}`
                  : person.birth_date
                    ? `b. ${person.birth_date.slice(0, 4)}`
                    : `d. ${person.end_date!.slice(0, 4)}`}
              </span>
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
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{person.bio}</p>
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

      {/* Awards */}
      {((awards && awards.length > 0) || person.awards) && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Awards
            {awards && awards.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">({awards.length})</span>
            )}
          </h2>
          {awards && awards.length > 0 && (
            <ul className="text-sm text-gray-700 space-y-1.5">
              {awards.map((a) => (
                <li key={a.id}>
                  {a.award} — {a.category} ({a.year}) — {a.result}
                  {a.lw_id && a.work_title && (
                    <>
                      {" "}
                      for{" "}
                      <Link to={`/works/${a.lw_id}`} className="text-violet-700 hover:underline italic">
                        {a.work_title}
                      </Link>
                    </>
                  )}
                  {a.notes && <span className="text-gray-400"> · {a.notes}</span>}
                </li>
              ))}
            </ul>
          )}
          {person.awards && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mt-2">
              {person.awards}
            </p>
          )}
        </div>
      )}

      {/* Works — grouped by type (Books, Short Stories, Magazines, …) */}
      {allWorks && allWorks.length > 0 && (
        <div className="space-y-10">
          {(() => {
            // Bucket works by type, preserving the API's date-desc order within
            // each bucket. Any unknown/future type falls into a trailing "Other".
            const buckets = new Map<string, WorkSummary[]>();
            for (const w of allWorks) {
              const key = WORK_CATEGORIES.some((c) => c.type === w.type) ? w.type : "OTHER";
              (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(w);
            }
            const sections = [
              ...WORK_CATEGORIES,
              { type: "OTHER", label: "Other" },
            ].filter((c) => (buckets.get(c.type)?.length ?? 0) > 0);

            return sections.map((c) => {
              const items = buckets.get(c.type)!;
              return (
                <div key={c.type}>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {c.label}
                    <span className="ml-2 text-sm font-normal text-gray-400">({items.length})</span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {items.map((w) => (
                      <WorkCard key={w.id} work={w} />
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
