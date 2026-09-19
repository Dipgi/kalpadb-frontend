import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, catalogue, volunteer, works, type WorkDetail } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import ContributorGate from "../../components/ContributorGate";
import ImageUploadField from "../../components/ImageUploadField";
import EditNoteField from "../../components/EditNoteField";
import TranslationLinksEditor from "../../components/TranslationLinksEditor";
import AwardsEditor from "../../components/AwardsEditor";
import ExternalLinksEditor from "../../components/ExternalLinksEditor";
import WorkRelationshipsEditor from "../../components/WorkRelationshipsEditor";
import FormSection from "../../components/FormSection";
import AcademicAuthorsEditor, {
  type AuthorRow,
  authorRowsFromExisting,
  authorRowsToPayload,
} from "../../components/AcademicAuthorsEditor";
import TagChipPicker from "../../components/TagChipPicker";
import EditSavedBanner from "../../components/EditSavedBanner";
import ClearedFieldsPrompt from "../../components/ClearedFieldsPrompt";
import { findClearedFields, type ClearedField } from "../../lib/clearedFields";
import { ACADEMIC_TYPE_OPTIONS } from "../../lib/workTypes";
import { createPersonInline } from "../../lib/inlineCreate";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

export default function AdminEditAcademic() {
  const { id } = useParams<{ id: string }>();
  const { data: work, isLoading } = useQuery({
    queryKey: ["work", id],
    queryFn: () => works.get(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-gray-400 py-12 text-center">Loading article…</div>;
  }
  if (!work) {
    return <div className="text-gray-400 py-12 text-center">Article not found.</div>;
  }
  if (work.type !== "ACADEMIC") {
    return (
      <div className="text-gray-400 py-12 text-center">
        Only ACADEMIC works can be edited here (this is {work.type}).
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

  const academic = work.academic;
  const [title, setTitle] = useState(work.title);
  const [language, setLanguage] = useState(work.language ?? "en");
  const [contentType, setContentType] = useState(work.content_type ?? "journal_article");
  const [year, setYear] = useState(work.publication_date ? work.publication_date.slice(0, 4) : "");
  const [abstract, setAbstract] = useState(academic?.abstract ?? "");
  const [keywords, setKeywords] = useState(academic?.keywords ?? "");
  const [containerTitle, setContainerTitle] = useState(academic?.container_title ?? "");
  const [publisher, setPublisher] = useState(academic?.publisher ?? "");
  const [volume, setVolume] = useState(academic?.volume ?? "");
  const [issue, setIssue] = useState(academic?.issue ?? "");
  const [pages, setPages] = useState(academic?.pages ?? "");
  const [edition, setEdition] = useState(academic?.edition ?? "");
  const [conferenceName, setConferenceName] = useState(academic?.conference_name ?? "");
  const [conferenceLocation, setConferenceLocation] = useState(academic?.conference_location ?? "");
  const [conferenceDate, setConferenceDate] = useState(academic?.conference_date ?? "");
  const [doi, setDoi] = useState(academic?.doi ?? "");
  const [isbn, setIsbn] = useState(academic?.isbn ?? "");
  const [issn, setIssn] = useState(academic?.issn ?? "");
  const [arxivId, setArxivId] = useState(academic?.arxiv_id ?? "");
  const [url, setUrl] = useState(academic?.url ?? "");
  const [citationKey, setCitationKey] = useState(academic?.citation_key ?? "");
  const [license, setLicense] = useState(academic?.license ?? "");
  const [citationNotes, setCitationNotes] = useState(academic?.citation_notes ?? "");
  const [peerReviewed, setPeerReviewed] = useState(!!academic?.peer_reviewed);
  const [openAccess, setOpenAccess] = useState(!!academic?.open_access);
  const [authors, setAuthors] = useState<AuthorRow[]>(
    authorRowsFromExisting(academic?.authors ?? [])
  );
  const [imageUrl, setImageUrl] = useState(work.image_urls?.[0] ?? "");
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
      const sub = await volunteer.updateAcademic(
        work.id,
        {
          title: title.trim(),
          language,
          content_type: contentType,
          publication_date: y ? `${y}-01-01` : null,
          image_urls: imageUrl.trim() ? [imageUrl.trim()] : [],
          authors: authorRowsToPayload(authors),
          abstract: abstract.trim() || null,
          keywords: keywords.trim() || null,
          container_title: containerTitle.trim() || null,
          publisher: publisher.trim() || null,
          volume: volume.trim() || null,
          issue: issue.trim() || null,
          pages: pages.trim() || null,
          edition: edition.trim() || null,
          conference_name: conferenceName.trim() || null,
          conference_location: conferenceLocation.trim() || null,
          conference_date: conferenceDate || null,
          isbn: isbn.trim() || null,
          issn: issn.trim() || null,
          arxiv_id: arxivId.trim() || null,
          citation_key: citationKey.trim() || null,
          license: license.trim() || null,
          citation_notes: citationNotes.trim() || null,
          doi: doi.trim() || null,
          url: url.trim() || null,
          peer_reviewed: peerReviewed,
          open_access: openAccess,
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
        { label: "Abstract", previous: academic?.abstract, next: abstract.trim() || null },
        { label: "Journal / venue", previous: academic?.container_title, next: containerTitle.trim() || null },
        { label: "DOI", previous: academic?.doi, next: doi.trim() || null },
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
        Edit Academic Article
        <span className="ml-2 text-sm font-normal text-gray-400">#{work.id}</span>
      </h1>

      {saved && (
        <EditSavedBanner isAdmin={!!isAdmin} viewHref={`/works/${work.id}`} viewLabel="View article" />
      )}

      <FormSection title="Basics">
        <div>
          <label className={labelCls}>Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Abstract / summary</label>
          <textarea
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            rows={3}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Keywords</label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Comma-separated, e.g. cyberpunk, translation, Bengali SF"
            className={inputCls}
          />
        </div>
      </FormSection>

      <FormSection title="Publication details">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Type</label>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={inputCls}>
              {ACADEMIC_TYPE_OPTIONS.map((o) => (
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
            <label className={labelCls}>Journal / venue</label>
            <input
              value={containerTitle}
              onChange={(e) => setContainerTitle(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Publisher</label>
            <input value={publisher} onChange={(e) => setPublisher(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Volume</label>
            <input value={volume} onChange={(e) => setVolume(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Issue</label>
            <input value={issue} onChange={(e) => setIssue(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Pages</label>
            <input value={pages} onChange={(e) => setPages(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Edition</label>
            <input value={edition} onChange={(e) => setEdition(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>ISBN</label>
            <input value={isbn} onChange={(e) => setIsbn(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>ISSN</label>
            <input value={issn} onChange={(e) => setIssn(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>DOI</label>
            <input value={doi} onChange={(e) => setDoi(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>arXiv ID</label>
            <input value={arxivId} onChange={(e) => setArxivId(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Citation key</label>
            <input value={citationKey} onChange={(e) => setCitationKey(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>License</label>
            <input value={license} onChange={(e) => setLicense(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={peerReviewed}
              onChange={(e) => setPeerReviewed(e.target.checked)}
            />
            Peer-reviewed
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={openAccess}
              onChange={(e) => setOpenAccess(e.target.checked)}
            />
            Open access
          </label>
        </div>
        <div>
          <label className={labelCls}>Citation notes</label>
          <textarea
            value={citationNotes}
            onChange={(e) => setCitationNotes(e.target.value)}
            rows={2}
            className={inputCls}
          />
        </div>
      </FormSection>

      <FormSection
        title="Conference (if applicable)"
        hint="Only relevant for a conference paper — leave blank otherwise."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Conference name</label>
            <input
              value={conferenceName}
              onChange={(e) => setConferenceName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input
              value={conferenceLocation}
              onChange={(e) => setConferenceLocation(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={conferenceDate}
              onChange={(e) => setConferenceDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Authors"
        hint="Order is citation-significant — use the ▲▼ buttons to reorder."
      >
        <AcademicAuthorsEditor
          rows={authors}
          onChange={setAuthors}
          onCreatePerson={canInlineCreate ? createPersonInline : undefined}
        />
      </FormSection>

      <FormSection
        title="Translations"
        hint="Link this article to a translated version or the original in another language."
      >
        <TranslationLinksEditor workId={work.id} workLanguage={work.language} isAdmin={!!isAdmin} />
      </FormSection>

      <FormSection
        title="Related works"
        hint="Link the SF work(s) this article discusses. Saved immediately, separately from the fields above."
      >
        <WorkRelationshipsEditor work={work} />
      </FormSection>

      <FormSection title="Cover & classification">
        <ImageUploadField
          label="Cover image (optional)"
          category="covers"
          value={imageUrl}
          onChange={(url) => setImageUrl(url ?? "")}
        />
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
                : "Delete article"}
          </button>
        )}
        {isAdmin && deleteMutation.isError && (
          <span className="text-sm text-red-500">Delete failed.</span>
        )}
      </div>
    </form>
  );
}
