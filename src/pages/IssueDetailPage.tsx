import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { works } from "../lib/api";
import { ISSUE_TYPE_LABELS, issueDisplay } from "../lib/issues";
import { useAuth } from "../hooks/useAuth";
import { PersonList } from "../components/PersonLink";
import { useSeo } from "../hooks/useSeo";

export default function IssueDetailPage() {
  const { magId, issueId } = useParams<{ magId: string; issueId: string }>();
  const { user: me } = useAuth();
  const magazineId = Number(magId);

  const { data: magazine } = useQuery({
    queryKey: ["work", magId],
    queryFn: () => works.get(magazineId),
    enabled: !!magId,
  });
  const { data: issues, isLoading } = useQuery({
    queryKey: ["magazine-issues", magazineId],
    queryFn: () => works.magazineIssues(magazineId),
    enabled: !!magId,
  });

  const issue = issues?.find((i) => i.m_issue_id === Number(issueId));

  useSeo({
    title:
      issue && magazine
        ? `${magazine.title} — ${issueDisplay(issue) ?? "Issue"}`
        : undefined,
    description: issue?.synopsis,
  });

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Loading…</div>;
  }
  if (!issue) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Issue not found.</div>;
  }

  const role = me?.role.toLowerCase();
  const editPath =
    role === "admin"
      ? `/magazines/${magazineId}/issues/${issue.m_issue_id}/edit`
      : role === "volunteer"
        ? `/magazines/${magazineId}/issues/${issue.m_issue_id}/edit`
        : null;

  const credit = (label: string, people: { id: number; name: string }[]) =>
    people.length > 0 ? (
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</h3>
        <p className="text-sm text-gray-700">
          {people.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ", "}
              <Link to={`/persons/${p.id}`} className="hover:text-violet-700">{p.name}</Link>
            </span>
          ))}
        </p>
      </div>
    ) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <p className="text-sm text-gray-400 mb-4">
        <Link to={`/works/${magazineId}`} className="hover:text-violet-700">
          {magazine?.title ?? "Magazine"}
        </Link>{" "}
        / issue
      </p>

      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="w-40 md:w-48 shrink-0">
          {issue.cover_image_url ? (
            <img
              src={issue.cover_image_url}
              alt={issueDisplay(issue) ?? "Issue cover"}
              className="w-full rounded-lg shadow-md"
            />
          ) : (
            <div className="w-full aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-xs">
              No cover
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {issueDisplay(issue) ?? `Issue #${issue.m_issue_id}`}
            </h1>
            {editPath && (
              <Link
                to={editPath}
                className="shrink-0 text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-700 transition-colors"
              >
                {role === "admin" ? "Edit ✎" : "Suggest an edit ✎"}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {(issue.volume_number != null || issue.issue_number != null) && (
              <span className="text-sm text-gray-500">
                {[
                  issue.volume_number != null ? `Vol ${issue.volume_number}` : null,
                  issue.issue_number != null ? `No ${issue.issue_number}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
            {issue.issue_type && issue.issue_type !== "regular" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                {ISSUE_TYPE_LABELS[issue.issue_type]}
              </span>
            )}
            {issue.publication_date && (
              <span className="text-gray-500 text-sm">{issue.publication_date}</span>
            )}
          </div>
          {issue.special_title && (
            <p className="text-gray-700 italic mb-3">{issue.special_title}</p>
          )}
          {issue.synopsis && (
            <p className="text-gray-600 text-sm leading-relaxed mb-4 whitespace-pre-line">{issue.synopsis}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {credit("Editors", issue.editors)}
            {credit("Cover artists", issue.cover_artists)}
            {credit("Illustrators", issue.illustrators)}
            {credit("Translators", issue.translators)}
            {issue.publishers.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Publishers</h3>
                <p className="text-sm text-gray-700">{issue.publishers.map((p) => p.name).join(", ")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {issue.stories.length > 0 && (
        <div className="border-t border-gray-100 pt-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Contents</h2>
          <ul className="space-y-1 text-sm">
            {issue.stories.map((s) => (
              <li key={s.story_id}>
                <Link to={`/works/${s.story_id}`} className="text-violet-700 hover:underline">
                  {s.title}
                </Link>
                {s.authors.length > 0 && (
                  <span className="text-gray-500"> — <PersonList people={s.authors} className="hover:text-violet-700 hover:underline" /></span>
                )}
                {s.page_start != null && (
                  <span className="text-gray-400">
                    {" "}· p.{s.page_start}
                    {s.page_end != null ? `–${s.page_end}` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {issue.contributors.length > 0 && (
            <div className="mt-4">
              {credit("Contributors", issue.contributors)}
            </div>
          )}
        </div>
      )}

      {issue.scans.length > 0 && (
        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Read / archive</h2>
          <ul className="space-y-1 text-sm">
            {issue.scans.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-violet-700 hover:underline">
                  {s.archive_host ?? s.url}
                </a>
                {s.legal_status && <span className="text-gray-400"> ({s.legal_status.replace(/_/g, " ")})</span>}
                {s.quality_note && <span className="text-gray-400"> — {s.quality_note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
