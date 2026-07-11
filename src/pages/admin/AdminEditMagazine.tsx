import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  admin,
  catalogue,
  volunteer,
  works,
  type MagazineStatus,
  type WorkDetail,
} from "../../lib/api";
import { issueDisplay } from "../../lib/issues";
import { useAuth } from "../../hooks/useAuth";
import ContributorGate from "../../components/ContributorGate";
import ImageUploadField from "../../components/ImageUploadField";
import EditNoteField from "../../components/EditNoteField";
import EditSavedBanner from "../../components/EditSavedBanner";
import ClearedFieldsPrompt from "../../components/ClearedFieldsPrompt";
import MagazineFrequencyEditor, {
  frequenciesToPayload,
  type FrequencyRow,
} from "../../components/MagazineFrequencyEditor";
import MagazineEditorshipEditor, {
  editorshipsToPayload,
  type EditorshipRow,
} from "../../components/MagazineEditorshipEditor";
import WorkRelationshipsEditor from "../../components/WorkRelationshipsEditor";
import TranslationLinksEditor from "../../components/TranslationLinksEditor";
import AwardsEditor from "../../components/AwardsEditor";
import ExternalLinksEditor from "../../components/ExternalLinksEditor";
import TagChipPicker from "../../components/TagChipPicker";
import FormSection from "../../components/FormSection";
import { findClearedFields, type ClearedField } from "../../lib/clearedFields";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

export default function AdminEditMagazine() {
  const { id } = useParams<{ id: string }>();
  const { data: work, isLoading } = useQuery({
    queryKey: ["work", id],
    queryFn: () => works.get(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-gray-400 py-12 text-center">Loading magazine…</div>;
  }
  if (!work) {
    return <div className="text-gray-400 py-12 text-center">Magazine not found.</div>;
  }
  if (work.type !== "MAGAZINE") {
    return (
      <div className="text-gray-400 py-12 text-center">
        Only MAGAZINE works can be edited here (this is {work.type}).
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
  const navigate = useNavigate();
  const [note, setNote] = useState("");

  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });

  const [title, setTitle] = useState(work.title);
  const [description, setDescription] = useState(work.description ?? "");
  const [language, setLanguage] = useState(work.language ?? "bn");
  const initialRoman = work.localised?.title?.[`${work.language ?? "bn"}-Latn`] ?? "";
  const [roman, setRoman] = useState(initialRoman);
  const [issn, setIssn] = useState(work.magazine_detail?.issn ?? "");
  const [frequencies, setFrequencies] = useState<FrequencyRow[]>(
    (work.magazine_detail?.frequencies ?? []).map((f) => ({
      frequency: f.frequency,
      start_year: f.start_year?.toString() ?? "",
      end_year: f.end_year?.toString() ?? "",
    }))
  );
  const [foundedYear, setFoundedYear] = useState(
    work.magazine_detail?.founded_year?.toString() ?? ""
  );
  const [ceasedYear, setCeasedYear] = useState(
    work.magazine_detail?.ceased_year?.toString() ?? ""
  );
  const [statusVal, setStatusVal] = useState<MagazineStatus | "">(
    work.magazine_detail?.status ?? ""
  );
  const [place, setPlace] = useState(work.magazine_detail?.place_of_publication ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(work.magazine_detail?.website_url ?? "");
  const [editorships, setEditorships] = useState<EditorshipRow[]>(
    (work.magazine_detail?.editorships ?? []).map((e) => ({
      person: { id: e.stakeholder.id, name: e.stakeholder.name },
      start_year: e.start_year?.toString() ?? "",
      end_year: e.end_year?.toString() ?? "",
      role: e.role ?? "",
    }))
  );
  const [logoUrl, setLogoUrl] = useState(work.image_urls?.[0] ?? "");
  const [genreIds, setGenreIds] = useState<Set<number>>(new Set(work.genres.map((g) => g.id)));
  const [tagIds, setTagIds] = useState<Set<number>>(new Set(work.tags.map((t) => t.id)));
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingClears, setPendingClears] = useState<ClearedField[] | null>(null);

  const issues = work.magazine_detail?.issues ?? [];

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
      const romanChanged = roman.trim() !== initialRoman.trim();
      const localised =
        romanChanged && roman.trim()
          ? { title: { [`${language}-Latn`]: roman.trim() } }
          : undefined;

      const sub = await volunteer.updateMagazine(
        work.id,
        {
          title: title.trim(),
          description: description.trim() || null,
          language,
          localised,
          issn: issn.trim() || null,
          frequencies: frequenciesToPayload(frequencies),
          founded_year: foundedYear.trim() ? Number(foundedYear) : null,
          ceased_year: ceasedYear.trim() ? Number(ceasedYear) : null,
          status: statusVal || null,
          place_of_publication: place.trim() || null,
          website_url: websiteUrl.trim() || null,
          editorships: editorshipsToPayload(editorships),
          image_urls: logoUrl.trim() ? [logoUrl.trim()] : [],
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
        { label: "Description", previous: work.description, next: description.trim() || null },
        { label: "ISSN", previous: work.magazine_detail?.issn, next: issn.trim() || null },
        {
          label: "Place of publication",
          previous: work.magazine_detail?.place_of_publication,
          next: place.trim() || null,
        },
        {
          label: "Official website",
          previous: work.magazine_detail?.website_url,
          next: websiteUrl.trim() || null,
        },
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
      className="max-w-3xl space-y-5"
    >
      <h1 className="text-xl font-bold text-gray-900">
        Edit Magazine
        <span className="ml-2 text-sm font-normal text-gray-400">#{work.id}</span>
      </h1>

      {saved && (
        <EditSavedBanner isAdmin={!!isAdmin} viewHref={`/works/${work.id}`} viewLabel="View magazine" />
      )}

      <FormSection title="Basics">
      <div>
        <label className={labelCls}>Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
      </div>

      {language !== "en" && (
        <div>
          <label className={labelCls}>Romanised title ({language}-Latn)</label>
          <input
            value={roman}
            onChange={(e) => setRoman(e.target.value)}
            placeholder="Auto-generated from the title — edit to override"
            className={inputCls}
          />
        </div>
      )}

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputCls}
        />
      </div>
      </FormSection>

      <FormSection title="Publication details">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls}>
            {(languages ?? [{ code: "bn", name: "Bengali", name_local: "বাংলা" }]).map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}{l.name_local && l.name_local !== l.name ? ` (${l.name_local})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>ISSN</label>
          <input value={issn} onChange={(e) => setIssn(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className={labelCls}>Founded (year)</label>
          <input
            type="number"
            value={foundedYear}
            onChange={(e) => setFoundedYear(e.target.value)}
            min={1800}
            max={2100}
            placeholder="e.g. 1963"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Ceased (year)</label>
          <input
            type="number"
            value={ceasedYear}
            onChange={(e) => setCeasedYear(e.target.value)}
            min={1800}
            max={2100}
            placeholder="blank if running"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select
            value={statusVal}
            onChange={(e) => setStatusVal(e.target.value as MagazineStatus | "")}
            className={inputCls}
          >
            <option value="">—</option>
            <option value="active">Active</option>
            <option value="ceased">Ceased</option>
            <option value="hiatus">Hiatus</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Place of publication</label>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="e.g. Kolkata"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Official website URL</label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
        </div>
      </div>
      </FormSection>

      <FormSection
        title="Frequency"
        hint="Release cadence over time. Add a period per cadence if it changed (years optional)."
      >
        <MagazineFrequencyEditor rows={frequencies} onChange={setFrequencies} />
      </FormSection>

      <FormSection
        title="Editors"
        hint="Who edited the magazine as a whole, and when — distinct from per-issue editor credits."
      >
        <MagazineEditorshipEditor rows={editorships} onChange={setEditorships} />
      </FormSection>

      <FormSection
        title="Related magazines"
        hint="Link titles that renamed or merged — e.g. this continues an earlier magazine."
      >
        <WorkRelationshipsEditor work={work} />
      </FormSection>

      <FormSection
        title="Translations"
        hint="Link this magazine to a translated edition in another language (or its original)."
      >
        <TranslationLinksEditor
          workId={work.id}
          workLanguage={work.language}
          isAdmin={!!isAdmin}
        />
      </FormSection>

      <FormSection title="Cover & classification">
      <ImageUploadField
        label="Cover / logo"
        category="covers"
        value={logoUrl}
        onChange={(url) => setLogoUrl(url ?? "")}
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
        hint="Saved immediately, separately from the fields above — no need to click Save."
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
                : "Delete magazine"}
          </button>
        )}
        {isAdmin && deleteMutation.isError && (
          <span className="text-sm text-red-500">Delete failed.</span>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4 mt-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">
            Issues <span className="font-normal text-gray-400">({issues.length})</span>
          </h2>
          <Link
            to={`/magazines/${work.id}/issues/new`}
            className="text-xs px-3 py-1.5 rounded-md bg-violet-700 text-white hover:bg-violet-800 transition-colors"
          >
            + Add issue
          </Link>
        </div>
        {issues.length === 0 ? (
          <p className="text-sm text-gray-400">No issues yet.</p>
        ) : (
          <ul className="text-sm divide-y divide-gray-100 border border-gray-100 rounded-md">
            {issues.map((i) => (
              <li key={i.m_issue_id} className="flex items-center justify-between px-3 py-2">
                <span className="text-gray-700">
                  {issueDisplay(i) ?? `Issue #${i.m_issue_id}`}
                  {i.publication_date ? (
                    <span className="text-gray-400"> · {i.publication_date.slice(0, 4)}</span>
                  ) : null}
                </span>
                <Link
                  to={`/magazines/${work.id}/issues/${i.m_issue_id}/edit`}
                  className="text-xs text-violet-600 hover:underline"
                >
                  Edit ✎
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
