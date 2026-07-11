import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  admin,
  catalogue,
  search,
  volunteer,
  works,
  type WorkDetail,
} from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import EntityPicker, { type PickerItem } from "../../components/EntityPicker";
import BylineFields, { bylinePayload } from "../../components/BylineFields";
import ImageUploadField from "../../components/ImageUploadField";
import MagazineIssuePicker, { type IssueRef } from "../../components/MagazineIssuePicker";
import SourceAttributionFields, {
  type SourceAttribution,
  sourceAttributionPayload,
} from "../../components/SourceAttributionFields";
import FirstPublishedField, {
  firstPublishedFromDetail,
  firstPublishedPayload,
  type FirstPublishedValue,
} from "../../components/FirstPublishedField";
import ContributorGate from "../../components/ContributorGate";
import EditNoteField from "../../components/EditNoteField";
import TranslationLinksEditor from "../../components/TranslationLinksEditor";
import AwardsEditor from "../../components/AwardsEditor";
import ExternalLinksEditor from "../../components/ExternalLinksEditor";
import WorkRelationshipsEditor from "../../components/WorkRelationshipsEditor";
import FormSection from "../../components/FormSection";
import TagChipPicker from "../../components/TagChipPicker";
import EditSavedBanner from "../../components/EditSavedBanner";
import ClearedFieldsPrompt from "../../components/ClearedFieldsPrompt";
import { findClearedFields, type ClearedField } from "../../lib/clearedFields";
import { WORLD_LANGUAGES } from "../../lib/languages";
import { STORY_TYPE_OPTIONS } from "../../lib/workTypes";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

/** Inline-create a person (name only), auto-approved, returned as a picker item. */
async function createPersonInline(
  name: string,
  opts?: { allowDuplicate?: boolean },
): Promise<PickerItem> {
  const sub = await volunteer.submitPerson({ name }, opts?.allowDuplicate);
  const entry = await admin.queue.review(sub.edit_id, true, "Direct admin entry");
  return { id: entry.record_id!, name };
}

export default function AdminEditStory() {
  const { id } = useParams<{ id: string }>();
  const { data: work, isLoading } = useQuery({
    queryKey: ["work", id],
    queryFn: () => works.get(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-gray-400 py-12 text-center">Loading story…</div>;
  }
  if (!work) {
    return <div className="text-gray-400 py-12 text-center">Story not found.</div>;
  }
  if (work.type !== "STORY") {
    return (
      <div className="text-gray-400 py-12 text-center">
        Only STORY works can be edited here (this is {work.type}).
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
  // story_length mirrors content_type; prefer story_length, fall back to content_type.
  const [storyType, setStoryType] = useState(
    work.story?.story_length ?? work.content_type ?? "shortstory"
  );
  // Romanised (Latin) title — auto-generated, editable; pins a manual override.
  const initialRoman = work.localised?.title?.[`${work.language ?? "bn"}-Latn`] ?? "";
  const [roman, setRoman] = useState(initialRoman);
  const [originalLanguage, setOriginalLanguage] = useState(work.original_language ?? "");
  const [year, setYear] = useState(
    work.publication_date ? work.publication_date.slice(0, 4) : ""
  );
  const [wordCount, setWordCount] = useState(work.story?.word_count?.toString() ?? "");
  const [pageCount, setPageCount] = useState(work.story?.page_count?.toString() ?? "");
  const [authors, setAuthors] = useState<PickerItem[]>(
    work.authors.map((a) => ({ id: a.id, name: a.name }))
  );
  const [translators, setTranslators] = useState<PickerItem[]>(
    (work.story?.translators ?? []).map((t) => ({ id: t.id, name: t.name }))
  );
  // Byline overrides per credited person ("credited as", e.g. a pen name).
  const [bylines, setBylines] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const a of work.authors) if (a.credited_as) init[a.id] = a.credited_as;
    for (const t of work.story?.translators ?? []) if (t.credited_as) init[t.id] = t.credited_as;
    return init;
  });
  const [collection, setCollection] = useState<PickerItem[]>(
    (work.story?.book_appearances ?? []).map((b) => ({
      id: b.book_id,
      name: b.book_title ?? `Book #${b.book_id}`,
    }))
  );
  const [firstPub, setFirstPub] = useState<FirstPublishedValue>(
    firstPublishedFromDetail(work.story?.first_published ?? null)
  );
  const [source, setSource] = useState<SourceAttribution>({
    original_title: work.story?.original_title ?? "",
    original_author: work.story?.original_author ?? "",
    source_relation: work.story?.source_relation ?? "",
  });
  const [headpieceUrl, setHeadpieceUrl] = useState(work.image_urls?.[0] ?? "");
  const [magIssues, setMagIssues] = useState<IssueRef[]>(
    (work.story?.magazine_appearances ?? []).map((a) => ({
      m_issue_id: a.m_issue_id,
      label: `${a.magazine_title ?? "Magazine"} — ${a.issue_label ?? `#${a.m_issue_id}`}`,
    }))
  );
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
      // Only send romanisation when edited; otherwise leave it to the auto-romaniser.
      const romanChanged = roman.trim() !== initialRoman.trim();
      const localised =
        romanChanged && roman.trim()
          ? { title: { [`${language}-Latn`]: roman.trim() } }
          : undefined;

      const sub = await volunteer.updateStory(
        work.id,
        {
          title: title.trim(),
          description: description.trim() || null,
          language,
          localised,
          original_language: originalLanguage || null,
          content_type: storyType || null,
          story_length: storyType || null,
          publication_date: y ? `${y}-01-01` : null,
          word_count: wordCount ? Number(wordCount) : null,
          page_count: pageCount ? Number(pageCount) : null,
          image_urls: headpieceUrl.trim() ? [headpieceUrl.trim()] : [],
          book_ids: collection.map((c) => c.id),
          magazine_issue_ids: magIssues.map((m) => m.m_issue_id),
          ...firstPublishedPayload(firstPub),
          ...sourceAttributionPayload(source),
          author_ids: authors.map((a) => a.id),
          translator_ids: translators.map((t) => t.id),
          credited_as: bylinePayload([...authors, ...translators], bylines),
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

  // Admin blanks clear the field; warn once before saving. Volunteer blanks are
  // left unchanged by the backend, so no warning is needed.
  function attemptSave() {
    setSaved(false);
    if (!title.trim()) return;
    if (isAdmin) {
      const cleared = findClearedFields([
        { label: "Description", previous: work.description, next: description.trim() || null },
        { label: "Original language", previous: work.original_language, next: originalLanguage || null },
        {
          label: "Publication year",
          previous: work.publication_date ? work.publication_date.slice(0, 4) : null,
          next: year || null,
        },
        { label: "Word count", previous: work.story?.word_count, next: wordCount ? Number(wordCount) : null },
        { label: "Page count", previous: work.story?.page_count, next: pageCount ? Number(pageCount) : null },
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
        Edit Story
        <span className="ml-2 text-sm font-normal text-gray-400">#{work.id}</span>
      </h1>

      {saved && (
        <EditSavedBanner isAdmin={!!isAdmin} viewHref={`/works/${work.id}`} viewLabel="View story" />
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
          <p className="mt-1 text-xs text-gray-400">
            Auto-generated for search. Leave untouched to keep it auto-updating; editing pins your
            version so the auto-romaniser won’t overwrite it.
          </p>
        </div>
      )}

      <div>
        <label className={labelCls}>Description / synopsis</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputCls}
        />
      </div>
      </FormSection>

      <FormSection title="Publication details">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Story type</label>
          <select value={storyType} onChange={(e) => setStoryType(e.target.value)} className={inputCls}>
            {STORY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
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
          <label className={labelCls}>Original language</label>
          <select
            value={originalLanguage}
            onChange={(e) => setOriginalLanguage(e.target.value)}
            className={inputCls}
          >
            <option value="">Not a translation</option>
            <optgroup label="World languages">
              {WORLD_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </optgroup>
            <optgroup label="Indian languages">
              {(languages ?? [])
                .filter((l) => !WORLD_LANGUAGES.some((w) => w.code === l.code))
                .map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}{l.name_local && l.name_local !== l.name ? ` (${l.name_local})` : ""}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label className={labelCls}>Publication year</label>
          <input
            type="number"
            min={1000}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Word count</label>
          <input
            type="number"
            min={1}
            value={wordCount}
            onChange={(e) => setWordCount(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Page count</label>
          <input
            type="number"
            min={1}
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      </FormSection>

      <FormSection
        title="People & credits"
        hint="Search existing people, or type a new name to create them inline."
      >
      <EntityPicker
        label="Authors"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={authors}
        onChange={setAuthors}
        onCreate={isAdmin ? createPersonInline : undefined}
      />
      <BylineFields people={authors} bylines={bylines} onChange={setBylines} admin />

      <EntityPicker
        label="Translators"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={translators}
        onChange={setTranslators}
        onCreate={isAdmin ? createPersonInline : undefined}
      />
      <BylineFields people={translators} bylines={bylines} onChange={setBylines} admin />
      </FormSection>

      <FormSection
        title="Appearances & first publication"
        hint="Every container the story appears in, plus its single original venue."
      >
      <EntityPicker
        label="Appears in (anthologies / collections — optional)"
        placeholder="Search a book…"
        fetchKey="picker-collection-books"
        fetcher={(q) =>
          search.query(q).then((r) => ({
            items: r.works
              .filter((w) => w.type === "BOOK")
              .map((w) => ({ id: w.id, name: w.title })),
          }))
        }
        selected={collection}
        onChange={setCollection}
      />

      <MagazineIssuePicker value={magIssues} onChange={setMagIssues} />

      <FirstPublishedField value={firstPub} onChange={setFirstPub} />
      </FormSection>

      <FormSection
        title="Source & translations"
        hint="An uncatalogued source as free text, or links to catalogued translations/originals."
      >
      <SourceAttributionFields value={source} onChange={setSource} />

      <TranslationLinksEditor
        workId={work.id}
        workLanguage={work.language}
        isAdmin={!!isAdmin}
      />
      </FormSection>

      <FormSection
        title="Related works"
        hint="Link sequels, prequels, spin-offs, retellings, or fix-ups. Saved immediately, separately from the fields above."
      >
        <WorkRelationshipsEditor work={work} />
      </FormSection>

      <FormSection title="Illustration & classification">
      <ImageUploadField
        label="Headpiece / illustration"
        category="illustrations"
        value={headpieceUrl}
        onChange={(url) => setHeadpieceUrl(url ?? "")}
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
                : "Delete story"}
          </button>
        )}
        {isAdmin && deleteMutation.isError && (
          <span className="text-sm text-red-500">Delete failed.</span>
        )}
      </div>
    </form>
  );
}
