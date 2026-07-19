import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  admin,
  catalogue,
  search,
  volunteer,
  getDuplicateError,
  type DuplicateError,
  type EditSubmission,
  type GenreItem,
  type MagazineStatus,
} from "../../lib/api";
import EntityPicker, { type PickerItem } from "../../components/EntityPicker";
import BylineFields, { bylinePayload } from "../../components/BylineFields";
import MagazineEditorshipEditor, {
  editorshipsToPayload,
  type EditorshipRow,
} from "../../components/MagazineEditorshipEditor";
import MagazineFrequencyEditor, {
  frequenciesToPayload,
  type FrequencyRow,
} from "../../components/MagazineFrequencyEditor";
import FormSection from "../../components/FormSection";
import FormatsEditor, {
  type FormatRow,
  emptyFormatRow,
  formatRowsToPayload,
  COMIC_FORMAT_TYPES,
} from "../../components/FormatsEditor";
import SourceAttributionFields, {
  type SourceAttribution,
  emptySourceAttribution,
  sourceAttributionPayload,
} from "../../components/SourceAttributionFields";
import DuplicateMatchPrompt from "../../components/DuplicateMatchPrompt";
import RoleHintSelect from "../../components/RoleHintSelect";
import ImageUploadField from "../../components/ImageUploadField";
import MagazineIssuePicker, { type IssueRef } from "../../components/MagazineIssuePicker";
import FirstPublishedField, {
  emptyFirstPublished,
  firstPublishedPayload,
  type FirstPublishedValue,
} from "../../components/FirstPublishedField";
import CountrySelect from "../../components/CountrySelect";
import PrimaryLanguageSelect from "../../components/PrimaryLanguageSelect";
import NativeNameField from "../../components/NativeNameField";
import PenNamesField, { type PenName } from "../../components/PenNamesField";
import MediaCreditsEditor, {
  type CreditRow,
  creditPeople,
  creditRowsToPayload,
} from "../../components/MediaCreditsEditor";
import MediaAdaptationsEditor, {
  type AdaptationRow,
  adaptationRowsToPayload,
} from "../../components/MediaAdaptationsEditor";
import MediaSeasonsEditor, {
  type SeasonRow,
  seasonRowsToPayload,
} from "../../components/MediaSeasonsEditor";
import { WORLD_LANGUAGES } from "../../lib/languages";
import { slugify } from "../../lib/slugify";
import TagChipPicker from "../../components/TagChipPicker";
import { createPersonInline, createPublisherInline } from "../../lib/inlineCreate";
import {
  WORK_TYPE_OPTIONS,
  STORY_TYPE_OPTIONS,
  COMIC_TYPE_OPTIONS,
  MEDIA_TYPE_OPTIONS,
  EPISODIC_MEDIA_TYPES,
} from "../../lib/workTypes";

type Tab =
  | "book"
  | "story"
  | "comic"
  | "media"
  | "magazine"
  | "issue"
  | "person"
  | "publisher"
  | "series";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

/** Submit via the volunteer pipeline, then auto-approve as admin. */
async function submitAndApprove(submit: () => Promise<EditSubmission>) {
  const sub = await submit();
  return admin.queue.review(sub.edit_id, true, "Direct admin entry");
}

export default function AdminAdd() {
  const [tab, setTab] = useState<Tab>("book");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Add Records</h1>

      <div className="flex gap-2 mb-6">
        {(["book", "story", "comic", "media", "magazine", "issue", "person", "publisher", "series"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm px-4 py-1.5 rounded-md border capitalize transition-colors ${
              tab === t
                ? "bg-violet-700 text-white border-violet-700"
                : "border-gray-300 text-gray-600 hover:border-violet-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "book" && <BookForm />}
      {tab === "story" && <StoryForm />}
      {tab === "comic" && <ComicForm />}
      {tab === "media" && <MediaForm />}
      {tab === "magazine" && <MagazineForm />}
      {tab === "issue" && <MagazineIssueChooser />}
      {tab === "person" && <PersonForm />}
      {tab === "publisher" && <PublisherForm />}
      {tab === "series" && <SeriesForm />}
    </div>
  );
}

// ── Success banner ──────────────────────────────────────────────────────────

function SuccessBanner({
  message,
  link,
  linkText,
  editLink,
  editText,
}: {
  message: string;
  link?: string;
  linkText?: string;
  editLink?: string;
  editText?: string;
}) {
  return (
    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3 mb-4">
      {message}{" "}
      {link && (
        <Link to={link} className="underline font-medium">
          {linkText ?? "View →"}
        </Link>
      )}
      {editLink && (
        <>
          {" · "}
          <Link to={editLink} className="underline font-medium">
            {editText ?? "Edit →"}
          </Link>
        </>
      )}
    </div>
  );
}

// ── Book form ───────────────────────────────────────────────────────────────

function BookForm() {
  const qc = useQueryClient();
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });
  const { data: seriesPage } = useQuery({ queryKey: ["all-series"], queryFn: catalogue.series });
  const seriesList = seriesPage?.items ?? [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("bn");
  const [contentType, setContentType] = useState("");
  const [originalLanguage, setOriginalLanguage] = useState("");
  const [year, setYear] = useState("");
  const [authors, setAuthors] = useState<PickerItem[]>([]);
  const [bylines, setBylines] = useState<Record<number, string>>({});
  const [editors, setEditors] = useState<PickerItem[]>([]);
  const [illustrators, setIllustrators] = useState<PickerItem[]>([]);
  const [translators, setTranslators] = useState<PickerItem[]>([]);
  const [coverArtists, setCoverArtists] = useState<PickerItem[]>([]);
  const [publishers, setPublishers] = useState<PickerItem[]>([]);
  const [genreIds, setGenreIds] = useState<Set<number>>(new Set());
  const [tagIds, setTagIds] = useState<Set<number>>(new Set());
  const [formats, setFormats] = useState<FormatRow[]>([emptyFormatRow()]);
  const [source, setSource] = useState<SourceAttribution>(emptySourceAttribution());
  const [seriesId, setSeriesId] = useState("");
  const [seriesPosition, setSeriesPosition] = useState("");
  const [editionLabel, setEditionLabel] = useState("");
  const [editionNotes, setEditionNotes] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [createdId, setCreatedId] = useState<number | null>(null);

  const [dup, setDup] = useState<DuplicateError | null>(null);

  const mutation = useMutation({
    mutationFn: (allowDuplicate: boolean) => {
      const y = year ? Number(year) : null;
      // Romanised title is auto-generated by the backend; it can only be
      // overridden later from the edit page.
      return submitAndApprove(() =>
        volunteer.submitBook({
          title: title.trim(),
          description: description.trim() || null,
          content_type: contentType || null,
          language,
          original_language: originalLanguage || null,
          publication_year: y,
          publication_date: y ? `${y}-01-01` : null,
          series_id: seriesId ? Number(seriesId) : null,
          series_position: seriesPosition ? Number(seriesPosition) : null,
          edition_label: editionLabel.trim() || null,
          edition_notes: editionNotes.trim() || null,
          ...sourceAttributionPayload(source),
          image_urls: coverUrl.trim() ? [coverUrl.trim()] : null,
          author_ids: authors.map((a) => a.id),
          credited_as: bylinePayload(
            [...authors, ...editors, ...translators, ...illustrators, ...coverArtists],
            bylines
          ),
          editor_ids: editors.map((e) => e.id),
          illustrator_ids: illustrators.map((i) => i.id),
          translator_ids: translators.map((t) => t.id),
          cover_artist_ids: coverArtists.map((c) => c.id),
          publisher_ids: publishers.map((p) => p.id),
          genre_ids: [...genreIds],
          tag_ids: [...tagIds],
          formats: formatRowsToPayload(formats),
        }, allowDuplicate)
      );
    },
    onError: (err) => setDup(getDuplicateError(err)),
    onSuccess: (entry) => {
      setDup(null);
      setCreatedId(entry.record_id);
      qc.invalidateQueries({ queryKey: ["works"] });
      qc.invalidateQueries({ queryKey: ["genres"] });
      setTitle("");
      setDescription("");
      setOriginalLanguage("");
      setYear("");
      setAuthors([]);
      setBylines({});
      setEditors([]);
      setIllustrators([]);
      setTranslators([]);
      setCoverArtists([]);
      setPublishers([]);
      setGenreIds(new Set());
      setTagIds(new Set());
      setFormats([emptyFormatRow()]);
      setSource(emptySourceAttribution());
      setSeriesId("");
      setSeriesPosition("");
      setEditionLabel("");
      setEditionNotes("");
      setCoverUrl("");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) {
          setDup(null);
          mutation.mutate(false);
        }
      }}
      className="max-w-2xl space-y-4"
    >
      {createdId != null && (
        <SuccessBanner
          message="Book created."
          link={`/works/${createdId}`}
          linkText="View book →"
          editLink={`/admin/edit/${createdId}`}
          editText="Edit / link translations →"
        />
      )}

      {dup && (
        <DuplicateMatchPrompt
          kind="work"
          candidates={dup.candidates}
          busy={mutation.isPending}
          onCreateAnyway={() => mutation.mutate(true)}
          onDismiss={() => {
            setDup(null);
            mutation.reset();
          }}
        />
      )}

      <FormSection title="Basics">
      <div>
        <label className={labelCls}>Title * (native script preferred)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
      </div>

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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Work type</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className={inputCls}
          >
            <option value="">Unspecified</option>
            {WORK_TYPE_OPTIONS.map((o) => (
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
          <label className={labelCls}>Original language (if translation)</label>
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
          <p className="mt-1 text-xs text-gray-400">
            Is the original also in KalpaDB? Create this record first, then link the two works
            from its Edit page (“Translations &amp; editions”).
          </p>
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
      </div>

      {seriesList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Series</label>
            <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className={inputCls}>
              <option value="">Not part of a series</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Position in series</label>
            <input
              type="number"
              min={1}
              value={seriesPosition}
              onChange={(e) => setSeriesPosition(e.target.value)}
              disabled={!seriesId}
              className={inputCls}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Edition label</label>
          <input value={editionLabel} onChange={(e) => setEditionLabel(e.target.value)} placeholder="e.g. First Edition" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Edition notes</label>
          <input value={editionNotes} onChange={(e) => setEditionNotes(e.target.value)} className={inputCls} />
        </div>
      </div>
      </FormSection>

      <FormSection
        title="Formats"
        hint="Hardcover / paperback / ebook / audiobook releases of this edition."
      >
        <FormatsEditor value={formats} onChange={setFormats} />
      </FormSection>

      <FormSection
        title="People & credits"
        hint="Search existing people, or type a new name to create them inline."
      >
      <EntityPicker
        label="Authors"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.personPicker(q)}
        selected={authors}
        onChange={setAuthors}
        onCreate={createPersonInline}
      />
      <BylineFields people={authors} bylines={bylines} onChange={setBylines} admin />

      <EntityPicker
        label="Editors"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.personPicker(q)}
        selected={editors}
        onChange={setEditors}
        onCreate={createPersonInline}
      />
      <BylineFields people={editors} bylines={bylines} onChange={setBylines} admin />

      <EntityPicker
        label="Translators"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.personPicker(q)}
        selected={translators}
        onChange={setTranslators}
        onCreate={createPersonInline}
      />
      <BylineFields people={translators} bylines={bylines} onChange={setBylines} admin />

      <EntityPicker
        label="Illustrators"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.personPicker(q)}
        selected={illustrators}
        onChange={setIllustrators}
        onCreate={createPersonInline}
      />
      <BylineFields people={illustrators} bylines={bylines} onChange={setBylines} admin />

      <EntityPicker
        label="Cover artists"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.personPicker(q)}
        selected={coverArtists}
        onChange={setCoverArtists}
        onCreate={createPersonInline}
      />
      <BylineFields people={coverArtists} bylines={bylines} onChange={setBylines} admin />

      <EntityPicker
        label="Publishers"
        placeholder="Search or create a publisher…"
        fetchKey="picker-publishers"
        fetcher={(q) => catalogue.publishers(q)}
        selected={publishers}
        onChange={setPublishers}
        onCreate={createPublisherInline}
      />
      </FormSection>

      <FormSection
        title="Source"
        hint="Where this work came from, when the original is not in the catalogue."
      >
        <SourceAttributionFields value={source} onChange={setSource} />
      </FormSection>

      <FormSection title="Cover & classification">
      <ImageUploadField
        label="Cover image"
        category="covers"
        value={coverUrl}
        onChange={(url) => setCoverUrl(url ?? "")}
      />

      <div>
        <label className={labelCls}>Genres</label>
        <div className="flex flex-wrap gap-2">
          {(allGenres ?? []).map((g: GenreItem) => (
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

      <SubmitRow pending={mutation.isPending} error={mutation.isError && !dup} label="Create book" />
    </form>
  );
}

// ── Story form ──────────────────────────────────────────────────────────────

function StoryForm() {
  const qc = useQueryClient();
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("bn");
  const [storyType, setStoryType] = useState("shortstory");
  const [originalLanguage, setOriginalLanguage] = useState("");
  const [year, setYear] = useState("");
  const [wordCount, setWordCount] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [headpieceUrl, setHeadpieceUrl] = useState("");
  const [authors, setAuthors] = useState<PickerItem[]>([]);
  const [bylines, setBylines] = useState<Record<number, string>>({});
  const [translators, setTranslators] = useState<PickerItem[]>([]);
  // The anthologies / collections this story appears in (optional, many-to-many).
  const [collection, setCollection] = useState<PickerItem[]>([]);
  const [magIssues, setMagIssues] = useState<IssueRef[]>([]);
  const [firstPub, setFirstPub] = useState<FirstPublishedValue>(emptyFirstPublished);
  const [source, setSource] = useState<SourceAttribution>(emptySourceAttribution());
  const [genreIds, setGenreIds] = useState<Set<number>>(new Set());
  const [tagIds, setTagIds] = useState<Set<number>>(new Set());
  const [createdId, setCreatedId] = useState<number | null>(null);

  const [dup, setDup] = useState<DuplicateError | null>(null);

  const mutation = useMutation({
    mutationFn: (allowDuplicate: boolean) => {
      const y = year ? Number(year) : null;
      return submitAndApprove(() =>
        volunteer.submitStory({
          title: title.trim(),
          description: description.trim() || null,
          language,
          original_language: originalLanguage || null,
          publication_date: y ? `${y}-01-01` : null,
          // story_length mirrors content_type on the LiteraryWork (see model).
          content_type: storyType || null,
          story_length: storyType || null,
          word_count: wordCount ? Number(wordCount) : null,
          page_count: pageCount ? Number(pageCount) : null,
          image_urls: headpieceUrl.trim() ? [headpieceUrl.trim()] : null,
          book_ids: collection.map((c) => c.id),
          magazine_issue_ids: magIssues.map((m) => m.m_issue_id),
          ...firstPublishedPayload(firstPub),
          ...sourceAttributionPayload(source),
          author_ids: authors.map((a) => a.id),
          translator_ids: translators.map((t) => t.id),
          credited_as: bylinePayload([...authors, ...translators], bylines),
          genre_ids: [...genreIds],
          tag_ids: [...tagIds],
        }, allowDuplicate)
      );
    },
    onError: (err) => setDup(getDuplicateError(err)),
    onSuccess: (entry) => {
      setDup(null);
      setCreatedId(entry.record_id);
      qc.invalidateQueries({ queryKey: ["works"] });
      setTitle("");
      setDescription("");
      setOriginalLanguage("");
      setYear("");
      setWordCount("");
      setPageCount("");
      setHeadpieceUrl("");
      setAuthors([]);
      setBylines({});
      setTranslators([]);
      setCollection([]);
      setMagIssues([]);
      setFirstPub(emptyFirstPublished);
      setSource(emptySourceAttribution());
      setGenreIds(new Set());
      setTagIds(new Set());
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) {
          setDup(null);
          mutation.mutate(false);
        }
      }}
      className="max-w-2xl space-y-4"
    >
      {createdId != null && (
        <SuccessBanner
          message="Story created."
          link={`/works/${createdId}`}
          linkText="View story →"
          editLink={`/admin/edit-story/${createdId}`}
          editText="Edit / link translations →"
        />
      )}

      {dup && (
        <DuplicateMatchPrompt
          kind="work"
          candidates={dup.candidates}
          busy={mutation.isPending}
          onCreateAnyway={() => mutation.mutate(true)}
          onDismiss={() => {
            setDup(null);
            mutation.reset();
          }}
        />
      )}

      <FormSection title="Basics">
      <div>
        <label className={labelCls}>Title * (native script preferred)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
        <p className="mt-1 text-xs text-gray-400">
          A romanised title for search is generated automatically; override it later from the edit page.
        </p>
      </div>

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
          <label className={labelCls}>Original language (if translation)</label>
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
          <p className="mt-1 text-xs text-gray-400">
            Is the original also in KalpaDB? Create this record first, then link the two works
            from its Edit page (“Translations &amp; editions”).
          </p>
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
        fetcher={(q) => catalogue.personPicker(q)}
        selected={authors}
        onChange={setAuthors}
        onCreate={createPersonInline}
      />
      <BylineFields people={authors} bylines={bylines} onChange={setBylines} admin />

      <EntityPicker
        label="Translators"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.personPicker(q)}
        selected={translators}
        onChange={setTranslators}
        onCreate={createPersonInline}
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
        title="Source"
        hint="Where this story came from, when the original is not in the catalogue."
      >
        <SourceAttributionFields value={source} onChange={setSource} />
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
          {(allGenres ?? []).map((g: GenreItem) => (
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

      <SubmitRow pending={mutation.isPending} error={mutation.isError && !dup} label="Create story" />
    </form>
  );
}

// ── Comic form ────────────────────────────────────────────────────────────────

function ComicForm() {
  const qc = useQueryClient();
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });
  const { data: seriesPage } = useQuery({ queryKey: ["all-series"], queryFn: catalogue.series });
  const seriesList = seriesPage?.items ?? [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("bn");
  const [contentType, setContentType] = useState("graphic_novel");
  const [originalLanguage, setOriginalLanguage] = useState("");
  const [year, setYear] = useState("");
  const [readingDirection, setReadingDirection] = useState<"" | "ltr" | "rtl">("");
  const [isColor, setIsColor] = useState<"" | "yes" | "no">("");
  const [pageCount, setPageCount] = useState("");
  const [isbn, setIsbn] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [seriesPosition, setSeriesPosition] = useState("");
  const [seriesPositionLabel, setSeriesPositionLabel] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [writers, setWriters] = useState<PickerItem[]>([]);
  // One byline map for the whole comic: applies to every role a person holds.
  const [bylines, setBylines] = useState<Record<number, string>>({});
  const [artists, setArtists] = useState<PickerItem[]>([]);
  const [inkers, setInkers] = useState<PickerItem[]>([]);
  const [colorists, setColorists] = useState<PickerItem[]>([]);
  const [letterers, setLetterers] = useState<PickerItem[]>([]);
  const [coverArtists, setCoverArtists] = useState<PickerItem[]>([]);
  const [translators, setTranslators] = useState<PickerItem[]>([]);
  const [editors, setEditors] = useState<PickerItem[]>([]);
  const [publishers, setPublishers] = useState<PickerItem[]>([]);
  const [formats, setFormats] = useState<FormatRow[]>([emptyFormatRow("single_issue")]);
  const [genreIds, setGenreIds] = useState<Set<number>>(new Set());
  const [tagIds, setTagIds] = useState<Set<number>>(new Set());
  const [createdId, setCreatedId] = useState<number | null>(null);

  const [dup, setDup] = useState<DuplicateError | null>(null);

  const mutation = useMutation({
    mutationFn: (allowDuplicate: boolean) => {
      const y = year ? Number(year) : null;
      return submitAndApprove(() =>
        volunteer.submitComic({
          title: title.trim(),
          description: description.trim() || null,
          language,
          original_language: originalLanguage || null,
          publication_date: y ? `${y}-01-01` : null,
          content_type: contentType || null,
          image_urls: coverUrl.trim() ? [coverUrl.trim()] : null,
          writer_ids: writers.map((w) => w.id),
          credited_as: bylinePayload(
            [
              ...writers,
              ...artists,
              ...inkers,
              ...colorists,
              ...letterers,
              ...coverArtists,
              ...translators,
              ...editors,
            ],
            bylines
          ),
          artist_ids: artists.map((a) => a.id),
          inker_ids: inkers.map((i) => i.id),
          colorist_ids: colorists.map((c) => c.id),
          letterer_ids: letterers.map((l) => l.id),
          cover_artist_ids: coverArtists.map((c) => c.id),
          translator_ids: translators.map((t) => t.id),
          editor_ids: editors.map((e) => e.id),
          publisher_ids: publishers.map((p) => p.id),
          reading_direction: readingDirection || null,
          is_color: isColor === "" ? null : isColor === "yes",
          page_count: pageCount ? Number(pageCount) : null,
          isbn: isbn.trim() || null,
          series_id: seriesId ? Number(seriesId) : null,
          series_position: seriesPosition ? Number(seriesPosition) : null,
          series_position_label: seriesPositionLabel.trim() || null,
          formats: formatRowsToPayload(formats, false, false),
          genre_ids: [...genreIds],
          tag_ids: [...tagIds],
        }, allowDuplicate)
      );
    },
    onError: (err) => setDup(getDuplicateError(err)),
    onSuccess: (entry) => {
      setDup(null);
      setCreatedId(entry.record_id);
      qc.invalidateQueries({ queryKey: ["works"] });
      setTitle("");
      setDescription("");
      setContentType("graphic_novel");
      setOriginalLanguage("");
      setYear("");
      setReadingDirection("");
      setIsColor("");
      setPageCount("");
      setIsbn("");
      setCoverUrl("");
      setWriters([]);
      setBylines({});
      setArtists([]);
      setInkers([]);
      setColorists([]);
      setLetterers([]);
      setCoverArtists([]);
      setTranslators([]);
      setEditors([]);
      setPublishers([]);
      setFormats([emptyFormatRow("single_issue")]);
      setSeriesId("");
      setSeriesPosition("");
      setSeriesPositionLabel("");
      setGenreIds(new Set());
      setTagIds(new Set());
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) {
          setDup(null);
          mutation.mutate(false);
        }
      }}
      className="max-w-2xl space-y-4"
    >
      {createdId != null && (
        <SuccessBanner
          message="Comic created."
          link={`/works/${createdId}`}
          linkText="View comic →"
          editLink={`/admin/edit-comic/${createdId}`}
          editText="Edit / link works →"
        />
      )}

      {dup && (
        <DuplicateMatchPrompt
          kind="work"
          candidates={dup.candidates}
          busy={mutation.isPending}
          onCreateAnyway={() => mutation.mutate(true)}
          onDismiss={() => {
            setDup(null);
            mutation.reset();
          }}
        />
      )}

      <FormSection title="Basics">
        <div>
          <label className={labelCls}>Title * (native script preferred)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
          <p className="mt-1 text-xs text-gray-400">
            A romanised title for search is generated automatically; override it later from the edit page.
          </p>
        </div>
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
            <label className={labelCls}>Comic type</label>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={inputCls}>
              {COMIC_TYPE_OPTIONS.map((o) => (
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
            <label className={labelCls}>Original language (if translation)</label>
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
            <label className={labelCls}>Reading direction</label>
            <select
              value={readingDirection}
              onChange={(e) => setReadingDirection(e.target.value as "" | "ltr" | "rtl")}
              className={inputCls}
            >
              <option value="">Unspecified</option>
              <option value="ltr">Left-to-right</option>
              <option value="rtl">Right-to-left (manga-style)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Colour</label>
            <select
              value={isColor}
              onChange={(e) => setIsColor(e.target.value as "" | "yes" | "no")}
              className={inputCls}
            >
              <option value="">Unspecified</option>
              <option value="yes">Colour</option>
              <option value="no">Black &amp; white</option>
            </select>
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
          <div>
            <label className={labelCls}>ISBN</label>
            <input value={isbn} onChange={(e) => setIsbn(e.target.value)} className={inputCls} />
          </div>
        </div>
      </FormSection>

      {seriesList.length > 0 && (
        <FormSection title="Series & issue" hint="Optional — link to a series and set the issue number.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Series</label>
              <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className={inputCls}>
                <option value="">Not part of a series</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Issue / position</label>
              <input
                type="number"
                min={1}
                value={seriesPosition}
                onChange={(e) => setSeriesPosition(e.target.value)}
                disabled={!seriesId}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Issue label (optional)</label>
              <input
                value={seriesPositionLabel}
                onChange={(e) => setSeriesPositionLabel(e.target.value)}
                placeholder="e.g. Annual, #12.5, Special"
                disabled={!seriesId}
                className={inputCls}
              />
            </div>
          </div>
        </FormSection>
      )}

      <FormSection title="Formats" hint="Print/digital editions — add a row per format (optional).">
        <FormatsEditor
          value={formats}
          onChange={setFormats}
          formatTypes={COMIC_FORMAT_TYPES}
          showAvailability={false}
          hint="Single issue, trade paperback, hardcover, omnibus, digital or webcomic — one row each."
        />
      </FormSection>

      <FormSection
        title="Creators & credits"
        hint="Writers double as the comic's authors. Search existing people, or type a new name to create them inline."
      >
        <EntityPicker
          label="Writers"
          placeholder="Search or create a person…"
          fetchKey="picker-persons"
          fetcher={(q) => catalogue.personPicker(q)}
          selected={writers}
          onChange={setWriters}
          onCreate={createPersonInline}
        />
        <BylineFields people={writers} bylines={bylines} onChange={setBylines} admin />
        <EntityPicker
          label="Artists (pencillers)"
          placeholder="Search or create a person…"
          fetchKey="picker-persons"
          fetcher={(q) => catalogue.personPicker(q)}
          selected={artists}
          onChange={setArtists}
          onCreate={createPersonInline}
        />
        <BylineFields people={artists} bylines={bylines} onChange={setBylines} admin />
        <EntityPicker
          label="Inkers"
          placeholder="Search or create a person…"
          fetchKey="picker-persons"
          fetcher={(q) => catalogue.personPicker(q)}
          selected={inkers}
          onChange={setInkers}
          onCreate={createPersonInline}
        />
        <BylineFields people={inkers} bylines={bylines} onChange={setBylines} admin />
        <EntityPicker
          label="Colorists"
          placeholder="Search or create a person…"
          fetchKey="picker-persons"
          fetcher={(q) => catalogue.personPicker(q)}
          selected={colorists}
          onChange={setColorists}
          onCreate={createPersonInline}
        />
        <BylineFields people={colorists} bylines={bylines} onChange={setBylines} admin />
        <EntityPicker
          label="Letterers"
          placeholder="Search or create a person…"
          fetchKey="picker-persons"
          fetcher={(q) => catalogue.personPicker(q)}
          selected={letterers}
          onChange={setLetterers}
          onCreate={createPersonInline}
        />
        <BylineFields people={letterers} bylines={bylines} onChange={setBylines} admin />
        <EntityPicker
          label="Cover artists"
          placeholder="Search or create a person…"
          fetchKey="picker-persons"
          fetcher={(q) => catalogue.personPicker(q)}
          selected={coverArtists}
          onChange={setCoverArtists}
          onCreate={createPersonInline}
        />
        <BylineFields people={coverArtists} bylines={bylines} onChange={setBylines} admin />
        <EntityPicker
          label="Translators"
          placeholder="Search or create a person…"
          fetchKey="picker-persons"
          fetcher={(q) => catalogue.personPicker(q)}
          selected={translators}
          onChange={setTranslators}
          onCreate={createPersonInline}
        />
        <BylineFields people={translators} bylines={bylines} onChange={setBylines} admin />
        <EntityPicker
          label="Editors"
          placeholder="Search or create a person…"
          fetchKey="picker-persons"
          fetcher={(q) => catalogue.personPicker(q)}
          selected={editors}
          onChange={setEditors}
          onCreate={createPersonInline}
        />
        <BylineFields people={editors} bylines={bylines} onChange={setBylines} admin />
        <EntityPicker
          label="Publishers"
          placeholder="Search or create a publisher…"
          fetchKey="picker-publishers"
          fetcher={(q) => catalogue.publishers(q)}
          selected={publishers}
          onChange={setPublishers}
          onCreate={createPublisherInline}
        />
      </FormSection>

      <FormSection title="Cover & classification">
        <ImageUploadField
          label="Cover image"
          category="covers"
          value={coverUrl}
          onChange={(url) => setCoverUrl(url ?? "")}
        />
        <div>
          <label className={labelCls}>Genres</label>
          <div className="flex flex-wrap gap-2">
            {(allGenres ?? []).map((g: GenreItem) => (
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

      <SubmitRow pending={mutation.isPending} error={mutation.isError && !dup} label="Create comic" />
    </form>
  );
}

// ── Magazine issue chooser ────────────────────────────────────────────────────

// Adding an issue needs a parent magazine, so pick one first, then hand off to
// the magazine-scoped add-issue page (which carries the magazine id in its route).
function MagazineIssueChooser() {
  const navigate = useNavigate();
  const [mag, setMag] = useState<PickerItem[]>([]);
  const magId = mag[0]?.id;
  return (
    <div className="space-y-4 max-w-xl">
      <p className="text-sm text-gray-500">
        Adding an issue of an existing magazine. Pick the magazine, then continue to fill in the
        issue. To add a brand-new magazine title instead, use the <strong>Magazine</strong> tab.
      </p>
      <EntityPicker
        label="Magazine"
        placeholder="Search a magazine…"
        fetchKey="admin-add-issue-magazine"
        fetcher={(q) =>
          search.query(q).then((r) => ({
            items: r.works
              .filter((w) => w.type === "MAGAZINE")
              .map((w) => ({ id: w.id, name: w.title })),
          }))
        }
        selected={mag}
        onChange={(items) => setMag(items.slice(-1))}
      />
      <button
        type="button"
        disabled={!magId}
        onClick={() => navigate(`/magazines/${magId}/issues/new`)}
        className="bg-violet-700 text-white text-sm px-5 py-2 rounded-md font-medium hover:bg-violet-800 disabled:opacity-40 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}

// ── Media form ────────────────────────────────────────────────────────────────

function MediaForm() {
  const qc = useQueryClient();
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("bn");
  const [contentType, setContentType] = useState("film");
  const [originalLanguage, setOriginalLanguage] = useState("");
  const [year, setYear] = useState("");
  const [runtime, setRuntime] = useState("");
  const [platform, setPlatform] = useState("");
  const [productionHouse, setProductionHouse] = useState("");
  const [country, setCountry] = useState("IN");
  const [ageRating, setAgeRating] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [credits, setCredits] = useState<CreditRow[]>([]);
  // One byline map for the whole work: applies to every credit a person holds.
  const [bylines, setBylines] = useState<Record<number, string>>({});
  const [adaptations, setAdaptations] = useState<AdaptationRow[]>([]);
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [genreIds, setGenreIds] = useState<Set<number>>(new Set());
  const [tagIds, setTagIds] = useState<Set<number>>(new Set());
  const [createdId, setCreatedId] = useState<number | null>(null);

  const episodic = EPISODIC_MEDIA_TYPES.has(contentType);

  const [dup, setDup] = useState<DuplicateError | null>(null);

  const mutation = useMutation({
    mutationFn: (allowDuplicate: boolean) => {
      const y = year ? Number(year) : null;
      const seasonPayload = episodic ? seasonRowsToPayload(seasons) : [];
      const episodeCounts = seasonPayload.map((s) => s.episode_count);
      return submitAndApprove(() =>
        volunteer.submitMedia({
          title: title.trim(),
          description: description.trim() || null,
          language,
          original_language: originalLanguage || null,
          publication_date: y ? `${y}-01-01` : null,
          content_type: contentType,
          image_urls: posterUrl.trim() ? [posterUrl.trim()] : null,
          credits: creditRowsToPayload(credits),
          credited_as: bylinePayload(creditPeople(credits), bylines),
          adaptations: adaptationRowsToPayload(adaptations),
          seasons: seasonPayload,
          runtime_minutes: runtime ? Number(runtime) : null,
          total_seasons: seasonPayload.length || null,
          total_episodes:
            seasonPayload.length && episodeCounts.every((c) => c != null)
              ? episodeCounts.reduce((a: number, c) => a + (c as number), 0)
              : null,
          platform: platform.trim() || null,
          production_house: productionHouse.trim() || null,
          country_of_origin: country || null,
          age_rating: ageRating.trim() || null,
          genre_ids: [...genreIds],
          tag_ids: [...tagIds],
        }, allowDuplicate)
      );
    },
    onError: (err) => setDup(getDuplicateError(err)),
    onSuccess: (entry) => {
      setDup(null);
      setCreatedId(entry.record_id);
      qc.invalidateQueries({ queryKey: ["works"] });
      setTitle("");
      setDescription("");
      setOriginalLanguage("");
      setYear("");
      setRuntime("");
      setPlatform("");
      setProductionHouse("");
      setAgeRating("");
      setPosterUrl("");
      setCredits([]);
      setBylines({});
      setAdaptations([]);
      setSeasons([]);
      setGenreIds(new Set());
      setTagIds(new Set());
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) {
          setDup(null);
          mutation.mutate(false);
        }
      }}
      className="max-w-2xl space-y-4"
    >
      {createdId != null && (
        <SuccessBanner
          message="Media work created."
          link={`/works/${createdId}`}
          linkText="View →"
          editLink={`/admin/edit-media/${createdId}`}
          editText="Edit / add trailer & watch links →"
        />
      )}

      {dup && (
        <DuplicateMatchPrompt
          kind="work"
          candidates={dup.candidates}
          busy={mutation.isPending}
          onCreateAnyway={() => mutation.mutate(true)}
          onDismiss={() => {
            setDup(null);
            mutation.reset();
          }}
        />
      )}

      <FormSection title="Basics">
        <div>
          <label className={labelCls}>Title * (native script preferred)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
          <p className="mt-1 text-xs text-gray-400">
            A romanised title for search is generated automatically; override it later from the edit page.
          </p>
        </div>
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

      <FormSection title="Release details">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Media type</label>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={inputCls}>
              {MEDIA_TYPE_OPTIONS.map((o) => (
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
            <label className={labelCls}>Original language (if dub/translation)</label>
            <select
              value={originalLanguage}
              onChange={(e) => setOriginalLanguage(e.target.value)}
              className={inputCls}
            >
              <option value="">Not a dub / translation</option>
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
            <label className={labelCls}>Release year</label>
            <input
              type="number"
              min={1900}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Runtime (minutes)</label>
            <input
              type="number"
              min={1}
              value={runtime}
              onChange={(e) => setRuntime(e.target.value)}
              placeholder={episodic ? "per episode" : ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Platform / venue</label>
            <input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="Hoichoi, YouTube, theatrical, stage…"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Production house</label>
            <input
              value={productionHouse}
              onChange={(e) => setProductionHouse(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Country of origin</label>
            <CountrySelect value={country} onChange={setCountry} />
          </div>
          <div>
            <label className={labelCls}>Age rating</label>
            <input
              value={ageRating}
              onChange={(e) => setAgeRating(e.target.value)}
              placeholder="U, U/A 13+, A…"
              className={inputCls}
            />
          </div>
        </div>
      </FormSection>

      {episodic && (
        <FormSection
          title="Seasons"
          hint="One row per season — totals are derived automatically. Per-episode entry may come later."
        >
          <MediaSeasonsEditor rows={seasons} onChange={setSeasons} />
        </FormSection>
      )}

      <FormSection
        title="Cast & crew"
        hint="Primary-creator credits (director, playwright, composer, singer) double as the work's byline in browse."
      >
        <MediaCreditsEditor
          rows={credits}
          onChange={setCredits}
          contentType={contentType}
          bylines={bylines}
          onBylinesChange={setBylines}
          onCreatePerson={createPersonInline}
          admin
        />
      </FormSection>

      <FormSection
        title="Based on (adaptations)"
        hint="Link the catalogued book/story this work adapts. The source work's page will show it under Adaptations."
      >
        <MediaAdaptationsEditor rows={adaptations} onChange={setAdaptations} />
      </FormSection>

      <FormSection title="Poster & classification">
        <ImageUploadField
          label="Poster / cover image"
          category="covers"
          value={posterUrl}
          onChange={(url) => setPosterUrl(url ?? "")}
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

      <p className="text-xs text-gray-400">
        Trailer and watch links are added from the edit page after creating (External links → type
        “trailer” / “watch”).
      </p>

      <button
        type="submit"
        disabled={mutation.isPending || !title.trim()}
        className="bg-violet-700 text-white text-sm px-5 py-2 rounded-md font-medium hover:bg-violet-800 disabled:opacity-40 transition-colors"
      >
        {mutation.isPending ? "Creating…" : "Create media work"}
      </button>
      {mutation.isError && !dup && (
        <span className="ml-3 text-sm text-red-500">Create failed — try again.</span>
      )}
    </form>
  );
}

// ── Magazine form ─────────────────────────────────────────────────────────────

function MagazineForm() {
  const qc = useQueryClient();
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("bn");
  const [issn, setIssn] = useState("");
  const [frequencies, setFrequencies] = useState<FrequencyRow[]>([]);
  const [foundedYear, setFoundedYear] = useState("");
  const [ceasedYear, setCeasedYear] = useState("");
  const [statusVal, setStatusVal] = useState<MagazineStatus | "">("");
  const [place, setPlace] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [editorships, setEditorships] = useState<EditorshipRow[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [genreIds, setGenreIds] = useState<Set<number>>(new Set());
  const [tagIds, setTagIds] = useState<Set<number>>(new Set());
  const [createdId, setCreatedId] = useState<number | null>(null);

  const [dup, setDup] = useState<DuplicateError | null>(null);

  const mutation = useMutation({
    mutationFn: (allowDuplicate: boolean) =>
      submitAndApprove(() =>
        volunteer.submitMagazine({
          title: title.trim(),
          description: description.trim() || null,
          language,
          issn: issn.trim() || null,
          frequencies: frequenciesToPayload(frequencies),
          founded_year: foundedYear.trim() ? Number(foundedYear) : null,
          ceased_year: ceasedYear.trim() ? Number(ceasedYear) : null,
          status: statusVal || null,
          place_of_publication: place.trim() || null,
          website_url: websiteUrl.trim() || null,
          editorships: editorshipsToPayload(editorships),
          image_urls: logoUrl.trim() ? [logoUrl.trim()] : null,
          genre_ids: [...genreIds],
          tag_ids: [...tagIds],
        }, allowDuplicate)
      ),
    onError: (err) => setDup(getDuplicateError(err)),
    onSuccess: (entry) => {
      setDup(null);
      setCreatedId(entry.record_id);
      qc.invalidateQueries({ queryKey: ["works"] });
      setTitle("");
      setDescription("");
      setIssn("");
      setFrequencies([]);
      setFoundedYear("");
      setCeasedYear("");
      setStatusVal("");
      setPlace("");
      setEditorships([]);
      setLogoUrl("");
      setGenreIds(new Set());
      setTagIds(new Set());
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) {
          setDup(null);
          mutation.mutate(false);
        }
      }}
      className="max-w-3xl space-y-5"
    >
      {createdId != null && (
        <SuccessBanner
          message="Magazine created — add issues and translation links from the edit page."
          link={`/works/${createdId}`}
          linkText="View magazine →"
          editLink={`/admin/edit-magazine/${createdId}`}
          editText="Edit →"
        />
      )}

      {dup && (
        <DuplicateMatchPrompt
          kind="work"
          candidates={dup.candidates}
          busy={mutation.isPending}
          onCreateAnyway={() => mutation.mutate(true)}
          onDismiss={() => {
            setDup(null);
            mutation.reset();
          }}
        />
      )}

      <FormSection title="Basics">
      <div>
        <label className={labelCls}>Title * (native script preferred)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
        <p className="mt-1 text-xs text-gray-400">
          The magazine title as a whole (e.g. আশ্চর্য!), not a single issue. A romanised title for
          search is generated automatically.
        </p>
      </div>

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
          {(allGenres ?? []).map((g: GenreItem) => (
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

      <p className="text-xs text-gray-400">
        Translated edition of a magazine that's also in KalpaDB? Create this record first, then
        link the two works from its Edit page (“Translations”).
      </p>

      <SubmitRow pending={mutation.isPending} error={mutation.isError && !dup} label="Create magazine" />
    </form>
  );
}

// ── Person form ─────────────────────────────────────────────────────────────

function PersonForm() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [nationality, setNationality] = useState("Indian");
  const [roleType, setRoleType] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [nativeName, setNativeName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [penNames, setPenNames] = useState<PenName[]>([]);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [dup, setDup] = useState<DuplicateError | null>(null);

  const mutation = useMutation({
    mutationFn: (allowDuplicate: boolean) =>
      submitAndApprove(() =>
        volunteer.submitPerson(
          {
            name: name.trim(),
            bio: bio.trim() || null,
            nationality: nationality.trim() || null,
            role_type: roleType.trim() || null,
            primary_language: primaryLanguage || null,
            birth_date: birthDate || null,
            end_date: deathDate || null,
            image_url: imageUrl.trim() || null,
            localised:
              primaryLanguage && nativeName.trim()
                ? { name: { [primaryLanguage]: nativeName.trim() } }
                : undefined,
            aliases: penNames
              .filter((p) => p.alias.trim())
              .map((p) => ({ alias: p.alias.trim(), alias_type: "pen_name", language: p.language })),
          },
          allowDuplicate,
        )
      ),
    onSuccess: (entry) => {
      setCreatedId(entry.record_id);
      setDup(null);
      setName("");
      setBio("");
      setPrimaryLanguage("");
      setNativeName("");
      setBirthDate("");
      setDeathDate("");
      setImageUrl("");
      setPenNames([]);
    },
    onError: (err) => setDup(getDuplicateError(err)),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) {
          setDup(null);
          mutation.mutate(false);
        }
      }}
      className="max-w-2xl space-y-4"
    >
      {createdId != null && (
        <SuccessBanner message="Person created." link={`/persons/${createdId}`} linkText="View person →" />
      )}

      {dup && (
        <DuplicateMatchPrompt
          kind="person"
          candidates={dup.candidates}
          busy={mutation.isPending}
          onCreateAnyway={() => mutation.mutate(true)}
          onDismiss={() => {
            setDup(null);
            mutation.reset();
            setName("");
          }}
        />
      )}

      <FormSection title="Basics">
      <div>
        <label className={labelCls}>Name * (in English)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
        <p className="mt-1 text-xs text-gray-400">
          The canonical English / romanised spelling. The native-script form is added below.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Primary role (hint)</label>
          <RoleHintSelect value={roleType} onChange={setRoleType} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Nationality</label>
          <input value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Birth date</label>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Death date</label>
          <input type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} className={inputCls} />
        </div>
      </div>
      </FormSection>

      <FormSection
        title="Names & scripts"
        hint="The native-script name form and any pen names this person writes under."
      >
      <PrimaryLanguageSelect value={primaryLanguage} onChange={setPrimaryLanguage} />

      <NativeNameField
        primaryLanguage={primaryLanguage}
        value={nativeName}
        onChange={setNativeName}
      />

      <PenNamesField value={penNames} onChange={setPenNames} />
      </FormSection>

      <FormSection title="Bio & image">
      <div>
        <label className={labelCls}>Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={inputCls} />
      </div>

      <ImageUploadField
        label="Image"
        category="people"
        value={imageUrl}
        onChange={(url) => setImageUrl(url ?? "")}
      />
      </FormSection>

      <SubmitRow pending={mutation.isPending} error={mutation.isError && !dup} label="Create person" />
    </form>
  );
}

// ── Publisher form ──────────────────────────────────────────────────────────

function PublisherForm() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("IN");
  const [foundedYear, setFoundedYear] = useState("");
  const [defunctYear, setDefunctYear] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [nativeName, setNativeName] = useState("");
  const [created, setCreated] = useState(false);
  const [dup, setDup] = useState<DuplicateError | null>(null);

  const mutation = useMutation({
    mutationFn: (allowDuplicate: boolean) =>
      submitAndApprove(() =>
        volunteer.submitPublisher(
          {
            name: name.trim(),
            city: city.trim() || null,
            country: country.trim() || null,
            founded_year: foundedYear ? Number(foundedYear) : null,
            defunct_year: defunctYear ? Number(defunctYear) : null,
            website: website.trim() || null,
            description: description.trim() || null,
            image_url: imageUrl.trim() || null,
            primary_language: primaryLanguage || null,
            localised:
              primaryLanguage && nativeName.trim()
                ? { name: { [primaryLanguage]: nativeName.trim() } }
                : undefined,
          },
          allowDuplicate,
        )
      ),
    onSuccess: () => {
      setCreated(true);
      setDup(null);
      setName("");
      setCity("");
      setFoundedYear("");
      setDefunctYear("");
      setWebsite("");
      setDescription("");
      setImageUrl("");
      setPrimaryLanguage("");
      setNativeName("");
    },
    onError: (err) => setDup(getDuplicateError(err)),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) {
          setDup(null);
          mutation.mutate(false);
        }
      }}
      className="max-w-2xl space-y-4"
    >
      {created && <SuccessBanner message="Publisher created — it can now be linked to books." />}

      {dup && (
        <DuplicateMatchPrompt
          kind="publisher"
          candidates={dup.candidates}
          busy={mutation.isPending}
          onCreateAnyway={() => mutation.mutate(true)}
          onDismiss={() => {
            setDup(null);
            mutation.reset();
            setName("");
          }}
        />
      )}

      <FormSection title="Basics">
      <div>
        <label className={labelCls}>Name * (in English)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
        <p className="mt-1 text-xs text-gray-400">
          The canonical English / romanised spelling. The native-script form is added below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Country</label>
          <CountrySelect value={country} onChange={setCountry} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Founded year</label>
          <input
            type="number"
            min={1000}
            max={2100}
            value={foundedYear}
            onChange={(e) => setFoundedYear(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Defunct year</label>
          <input
            type="number"
            min={1000}
            max={2100}
            value={defunctYear}
            onChange={(e) => setDefunctYear(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      </FormSection>

      <FormSection
        title="Names & scripts"
        hint="The native-script form of the publisher's name, for display and search."
      >
      <PrimaryLanguageSelect value={primaryLanguage} onChange={setPrimaryLanguage} />

      <NativeNameField
        primaryLanguage={primaryLanguage}
        value={nativeName}
        onChange={setNativeName}
      />
      </FormSection>

      <FormSection title="Details & image">
      <div>
        <label className={labelCls}>Website</label>
        <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
      </div>

      <ImageUploadField
        label="Image / logo"
        category="publishers"
        value={imageUrl}
        onChange={(url) => setImageUrl(url ?? "")}
      />
      </FormSection>

      <SubmitRow pending={mutation.isPending} error={mutation.isError && !dup} label="Create publisher" />
    </form>
  );
}

function SeriesForm() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [created, setCreated] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      submitAndApprove(() =>
        volunteer.submitSeries({
          name: name.trim(),
          slug: slug.trim() || null,
          description: description.trim() || null,
        })
      ),
    onSuccess: () => {
      setCreated(true);
      setName("");
      setSlug("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["all-series"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) mutation.mutate();
      }}
      className="max-w-2xl space-y-4"
    >
      {created && <SuccessBanner message="Series created — books can now be assigned to it." link="/series" linkText="Browse series →" />}

      <div>
        <label className={labelCls}>Name *</label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug) setSlug(slugify(e.target.value));
          }}
          required
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Slug (optional — lowercase, hyphens)</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          pattern="[a-z0-9\-]*"
          placeholder="auto-generated if left blank"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
      </div>

      <SubmitRow pending={mutation.isPending} error={mutation.isError} label="Create series" />
    </form>
  );
}

function SubmitRow({ pending, error, label }: { pending: boolean; error: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="submit"
        disabled={pending}
        className="bg-violet-700 text-white text-sm px-5 py-2 rounded-md font-medium hover:bg-violet-800 disabled:opacity-40 transition-colors"
      >
        {pending ? "Creating…" : label}
      </button>
      {error && <span className="text-sm text-red-500">Failed — check fields and try again.</span>}
    </div>
  );
}
