import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { works, search, volunteer, admin, type WorkSummary } from "../lib/api";
import { romanisedTitle } from "../lib/title";
import { useAuth } from "../hooks/useAuth";

const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

const ROLE_LABEL: Record<string, string> = {
  translation: "Translation",
  original: "Original work",
};

/**
 * Manage a work's translation links (both directions). Adding goes through the
 * review queue (auto-approved for admins); removing is admin-only.
 */
export default function TranslationLinksEditor({
  workId,
  workLanguage,
  isAdmin,
}: {
  workId: number;
  workLanguage: string | null;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  // Admins and trusted volunteers write live; others queue for review.
  const applied = isAdmin || !!user?.auto_approve;
  const [q, setQ] = useState("");
  const [submittedNote, setSubmittedNote] = useState(false);
  // Whether THIS work is the original or the translation of the work being added.
  const [thisRole, setThisRole] = useState<"original" | "translation">("original");

  const { data: editions } = useQuery({
    queryKey: ["work-translations", workId],
    queryFn: () => works.translations(workId),
  });

  const { data: results } = useQuery({
    queryKey: ["work-search-pick", q],
    queryFn: () => search.query(q.trim()),
    enabled: q.trim().length >= 2,
  });

  const linkedIds = new Set((editions ?? []).map((e) => e.work.id));

  const addMutation = useMutation({
    mutationFn: async (picked: WorkSummary) => {
      const thisIsOriginal = thisRole === "original";
      const sub = await volunteer.addTranslation(workId, {
        translated_lw_id: picked.id,
        this_work_role: thisRole,
        original_language: thisIsOriginal ? workLanguage : picked.language,
        target_language: thisIsOriginal ? picked.language : workLanguage,
      });
      if (isAdmin) await admin.queue.review(sub.edit_id, true, "Direct admin edit");
      return sub;
    },
    onSuccess: () => {
      setQ("");
      if (applied) {
        qc.invalidateQueries({ queryKey: ["work-translations", workId] });
      } else {
        setSubmittedNote(true);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (linkId: number) => admin.translations.delete(linkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-translations", workId] }),
  });

  const candidates = (results?.works ?? []).filter(
    (w) => w.id !== workId && !linkedIds.has(w.id),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className={labelCls + " mb-0"}>Translations &amp; editions</label>
        <span className="text-xs text-gray-400">
          Link this work to its translation in another language (or its original).
        </span>
      </div>

      {editions && editions.length > 0 && (
        <ul className="space-y-2">
          {editions.map((e) => {
            const roman = romanisedTitle(e.work.localised, e.work.title, e.work.language);
            return (
              <li
                key={e.link_id}
                className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2 bg-white"
              >
                <div className="min-w-0">
                  <span className="text-[11px] uppercase tracking-wide text-violet-600 font-semibold mr-2">
                    {ROLE_LABEL[e.role] ?? e.role}
                  </span>
                  <Link to={`/works/${e.work.id}`} className="text-sm text-gray-900 hover:underline">
                    {e.work.title}
                  </Link>
                  {roman && <span className="text-xs text-gray-400 ml-1">({roman})</span>}
                  {e.work.language && (
                    <span className="text-xs text-gray-400 ml-1 uppercase">· {e.work.language}</span>
                  )}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(e.link_id)}
                    disabled={deleteMutation.isPending}
                    className="shrink-0 text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {submittedNote && !applied && (
        <p className="text-xs text-green-700">
          Submitted for review — it’ll appear here once an admin approves it.
        </p>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
          <span>This work is the</span>
          <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
            {(["original", "translation"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setThisRole(r)}
                className={
                  "px-2.5 py-1 capitalize " +
                  (thisRole === r
                    ? "bg-violet-600 text-white"
                    : "bg-white text-gray-600 hover:bg-violet-50")
                }
              >
                {r}
              </button>
            ))}
          </div>
          <span>
            of the work you add — so pick the {thisRole === "original" ? "translation" : "original"}.
          </span>
        </div>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSubmittedNote(false);
          }}
          placeholder="Search a work to link as a translation/original…"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        {q.trim().length >= 2 && (
          <div className="mt-1 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-auto">
            {candidates.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-2">No matching works.</p>
            ) : (
              candidates.map((w) => {
                const roman = romanisedTitle(w.localised, w.title, w.language);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => addMutation.mutate(w)}
                    disabled={addMutation.isPending}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 disabled:opacity-40"
                  >
                    {w.title}
                    {roman && <span className="text-xs text-gray-400 ml-1">({roman})</span>}
                    {w.language && (
                      <span className="text-xs text-gray-400 ml-1 uppercase">· {w.language}</span>
                    )}
                    {w.authors[0] && (
                      <span className="text-xs text-gray-400 ml-1">— {w.authors[0].name}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
        {addMutation.isError && (
          <p className="text-xs text-red-500 mt-1">
            Could not add the link (it may already exist).
          </p>
        )}
      </div>
    </div>
  );
}
