import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, catalogue, volunteer, works, type WorkDetail } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { bylinePayload } from "../../components/BylineFields";
import ContributorGate from "../../components/ContributorGate";
import EditNoteField from "../../components/EditNoteField";
import TranslationLinksEditor from "../../components/TranslationLinksEditor";
import AwardsEditor from "../../components/AwardsEditor";
import ExternalLinksEditor from "../../components/ExternalLinksEditor";
import WorkRelationshipsEditor from "../../components/WorkRelationshipsEditor";
import FormSection from "../../components/FormSection";
import CoverageContributorsEditor, {
  type ContributorRow,
  contributorPeople,
  contributorRowsFromExisting,
  contributorRowsToPayload,
} from "../../components/CoverageContributorsEditor";
import TagChipPicker from "../../components/TagChipPicker";
import EditSavedBanner from "../../components/EditSavedBanner";
import ClearedFieldsPrompt from "../../components/ClearedFieldsPrompt";
import { findClearedFields, type ClearedField } from "../../lib/clearedFields";
import { COVERAGE_TYPE_OPTIONS } from "../../lib/workTypes";
import { createPersonInline } from "../../lib/inlineCreate";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

export default function AdminEditCoverage() {
  const { id } = useParams<{ id: string }>();
  const { data: work, isLoading } = useQuery({
    queryKey: ["work", id],
    queryFn: () => works.get(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-gray-400 py-12 text-center">Loading coverage item…</div>;
  }
  if (!work) {
    return <div className="text-gray-400 py-12 text-center">Coverage item not found.</div>;
  }
  if (work.type !== "COVERAGE") {
    return (
      <div className="text-gray-400 py-12 text-center">
        Only COVERAGE works can be edited here (this is {work.type}).
      </div>
    );
  }
  return (
    <ContributorGate>
      <EditForm key={work.id} work={work} />
    </ContributorGate>
  );
}

function EditForm({ work }: { work: WorkDetail }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";
  const canInlineCreate = isAdmin || !!user?.auto_approve;
  const navigate = useNavigate();
  const [note, setNote] = useState("");

  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });

  const coverage = work.coverage;
  const [title, setTitle] = useState(work.title);
  const [language, setLanguage] = useState(work.language ?? "en");
  const [contentType, setContentType] = useState(work.content_type ?? "newspaper_article");
  const [year, setYear] = useState(work.publication_date ? work.publication_date.slice(0, 4) : "");
  const [summary, setSummary] = useState(coverage?.summary ?? "");
  const [outlet, setOutlet] = useState(coverage?.outlet ?? "");
  const [outletType, setOutletType] = useState(coverage?.outlet_type ?? "");
  const [url, setUrl] = useState(coverage?.url ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    coverage?.duration_minutes?.toString() ?? ""
  );
  const [isPaywalled, setIsPaywalled] = useState(!!coverage?.is_paywalled);
  const [contributors, setContributors] = useState<ContributorRow[]>(
    contributorRowsFromExisting(coverage?.contributors ?? [])
  );
  const [bylines, setBylines] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const c of coverage?.contributors ?? []) {
      if (c.credited_as && !init[c.stakeholder.id]) init[c.stakeholder.id] = c.credited_as;
    }
    return init;
  });
  const [genreIds, setGenreIds] = useState<Set<number>>(new Set(work.genres.map((g) => g.id)));
  const [tagIds, setTagIds] = useState<Set<number>>(new Set(work.tags.map((t) => t.id)));
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingClears, setPendingClears] = useState<ClearedField[] | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => admin.works.delete(work.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["works"] });
      qc.removeQueries({ queryKey: ["work", String(work.id)] });
      navigate("/admin/tagging");
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const y = year ? Number(year) : null;
      const sub = await volunteer.updateCoverage(
        work.id,
        {
          title: title.trim(),
          language,
          content_type: contentType,
          publication_date: y ? `${y}-01-01` : null,
          contributors: contributorRowsToPayload(contributors),
          credited_as: bylinePayload(contributorPeople(contributors), bylines),
          summary: summary.trim() || null,
          outlet: outlet.trim() || null,
          outlet_type: outletType.trim() || null,
          url: url.trim() || null,
          duration_minutes: durationMinutes ? Number(durationMinutes) : null,
          is_paywalled: isPaywalled,
          genre_ids: [...genreIds],
          tag_ids: [...tagIds],
        },
        isAdmin ? undefined : note
      );
      if (isAdmin) await admin.queue.review(sub.edit_id, true, "Direct admin edit");
      return sub;
    },
    onSuccess: () => {
      setSaved(true);
      setPendingClears(null);
      if (isAdmin) {
        qc.invalidateQueries({ queryKey: ["work", String(work.id)] });
        qc.invalidateQueries({ queryKey: ["works"] });
      }
    },
  });

  function attemptSave() {
    setSaved(false);
    if (!title.trim()) return;
    if (isAdmin) {
      const cleared = findClearedFields([
        { label: "Summary", previous: coverage?.summary, next: summary.trim() || null },
        { label: "Outlet", previous: coverage?.outlet, next: outlet.trim() || null },
        { label: "URL", previous: coverage?.url, next: url.trim() || null },
      ]);
      if (cleared.length) {
        setPendingClears(cleared);
        return;
      }
    }
    mutation.mutate();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        attemptSave();
      }}
      className="max-w-2xl space-y-4"
    >
      <h1 className="text-xl font-bold text-gray-900">
        Edit Coverage Item
        <span className="ml-2 text-sm font-normal text-gray-400">#{work.id}</span>
      </h1>

      {saved && (
        <EditSavedBanner isAdmin={!!isAdmin} viewHref={`/works/${work.id}`} viewLabel="View item" />
      )}

      <FormSection title="Basics">
        <div>
          <label className={labelCls}>Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className={inputCls}
          />
        </div>
      </FormSection>

      <FormSection title="Coverage details">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Type</label>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={inputCls}>
              {COVERAGE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls}>
              {(languages ?? [{ code: "en", name: "English", name_local: "English" }]).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}{l.name_local && l.name_local !== l.name ? ` (${l.name_local})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Year</label>
            <input
              type="number"
              min={1800}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Outlet</label>
            <input value={outlet} onChange={(e) => setOutlet(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Outlet type</label>
            <input
              value={outletType}
              onChange={(e) => setOutletType(e.target.value)}
              placeholder="newspaper, tv, podcast…"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Duration (minutes, if audio/video)</label>
            <input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-3">
            <label className={labelCls}>URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} />
          </div>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={isPaywalled}
            onChange={(e) => setIsPaywalled(e.target.checked)}
          />
          Paywalled
        </label>
      </FormSection>

      <FormSection
        title="Contributors"
        hint="A contributor with role “Author” shows as a byline on the item's card."
      >
        <CoverageContributorsEditor
          rows={contributors}
          onChange={setContributors}
          bylines={bylines}
          onBylinesChange={setBylines}
          onCreatePerson={canInlineCreate ? createPersonInline : undefined}
          admin={!!isAdmin}
        />
      </FormSection>

      <FormSection
        title="Translations"
        hint="Link this item to a translated version or the original in another language."
      >
        <TranslationLinksEditor workId={work.id} workLanguage={work.language} isAdmin={!!isAdmin} />
      </FormSection>

      <FormSection
        title="Related works"
        hint="Link the SF work(s) this item discusses. Saved immediately, separately from the fields above."
      >
        <WorkRelationshipsEditor work={work} />
      </FormSection>

      <FormSection title="Classification">
        <div>
          <label className={labelCls}>Genres</label>
          <div className="flex flex-wrap gap-2">
            {(allGenres ?? []).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() =>
                  setGenreIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(g.id)) next.delete(g.id);
                    else next.add(g.id);
                    return next;
                  })
                }
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  genreIds.has(g.id)
                    ? "bg-violet-700 text-white border-violet-700"
                    : "bg-white border-gray-300 text-gray-600 hover:border-violet-400"
                }`}
              >
                {g.genre_name}
              </button>
            ))}
          </div>
        </div>
        <TagChipPicker selected={tagIds} onChange={setTagIds} />
      </FormSection>

      <FormSection
        title="Awards & external links"
        hint="Saved immediately, separately from the fields above."
      >
        <AwardsEditor target={{ kind: "work", id: work.id }} isAdmin={!!isAdmin} />
        <ExternalLinksEditor
          target={{ kind: "work", id: work.id }}
          links={work.external_links}
          isAdmin={!!isAdmin}
        />
      </FormSection>

      <EditNoteField show={!isAdmin} value={note} onChange={setNote} />

      {pendingClears && (
        <ClearedFieldsPrompt
          fields={pendingClears}
          onConfirm={() => mutation.mutate()}
          onCancel={() => setPendingClears(null)}
          busy={mutation.isPending}
        />
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-violet-700 text-white text-sm px-5 py-2 rounded-md font-medium hover:bg-violet-800 disabled:opacity-40 transition-colors"
        >
          {mutation.isPending
            ? isAdmin
              ? "Saving…"
              : "Submitting…"
            : isAdmin
              ? "Save changes"
              : "Submit for review"}
        </button>
        <Link to={`/works/${work.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </Link>
        {mutation.isError && <span className="text-sm text-red-500">Save failed — try again.</span>}

        {isAdmin && (
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirmDelete) deleteMutation.mutate();
              else setConfirmDelete(true);
            }}
            onBlur={() => setConfirmDelete(false)}
            className={`ml-auto text-sm px-4 py-2 rounded-md border transition-colors disabled:opacity-40 ${
              confirmDelete
                ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                : "border-red-300 text-red-600 hover:bg-red-50"
            }`}
          >
            {deleteMutation.isPending
              ? "Deleting…"
              : confirmDelete
                ? "Click again to permanently delete"
                : "Delete coverage item"}
          </button>
        )}
        {isAdmin && deleteMutation.isError && (
          <span className="text-sm text-red-500">Delete failed.</span>
        )}
      </div>
    </form>
  );
}
