import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import {
  auth,
  catalogue,
  search,
  volunteer,
  getDuplicateError,
  type DuplicateError,
  type GenreItem,
  type MagazineStatus,
} from "../lib/api";
import EntityPicker, { type PickerItem } from "../components/EntityPicker";
import FormSection from "../components/FormSection";
import TagChipPicker from "../components/TagChipPicker";
import { slugify } from "../lib/slugify";
import BylineFields, { bylinePayload } from "../components/BylineFields";
import FormatsEditor, {
  type FormatRow,
  emptyFormatRow,
  formatRowsToPayload,
  COMIC_FORMAT_TYPES,
} from "../components/FormatsEditor";
import SourceAttributionFields, {
  type SourceAttribution,
  emptySourceAttribution,
  sourceAttributionPayload,
} from "../components/SourceAttributionFields";
import DuplicateMatchPrompt from "../components/DuplicateMatchPrompt";
import ImageUploadField from "../components/ImageUploadField";
import MagazineIssuePicker, { type IssueRef } from "../components/MagazineIssuePicker";
import MagazineFrequencyEditor, {
  type FrequencyRow,
  frequenciesToPayload,
} from "../components/MagazineFrequencyEditor";
import MagazineEditorshipEditor, {
  type EditorshipRow,
  editorshipsToPayload,
} from "../components/MagazineEditorshipEditor";
import FirstPublishedField, {
  emptyFirstPublished,
  firstPublishedPayload,
  type FirstPublishedValue,
} from "../components/FirstPublishedField";
import PenNamesField, { type PenName } from "../components/PenNamesField";
import PrimaryLanguageSelect from "../components/PrimaryLanguageSelect";
import NativeNameField from "../components/NativeNameField";
import CountrySelect from "../components/CountrySelect";
import { WORLD_LANGUAGES } from "../lib/languages";
import { WORK_TYPE_OPTIONS, STORY_TYPE_OPTIONS } from "../lib/workTypes";

type Tab = "book" | "story" | "comic" | "magazine" | "issue" | "person" | "publisher" | "series";

const TAB_LABELS: Record<Tab, string> = {
  book: "Book",
  story: "Story",
  comic: "Comic",
  magazine: "Magazine",
  issue: "Magazine issue",
  person: "Person",
  publisher: "Publisher",
  series: "Series",
};

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

export default function ContributePage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("book");
  // Local override so the one-time terms gate disappears after acceptance
  // without needing to refetch the auth context this session.
  const [agreedNow, setAgreedNow] = useState(false);

  if (loading) return null;

  if (!user) {
    return (
      <Centered>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contribute to KalpaDB</h1>
        <p className="text-sm text-gray-500">
          Please{" "}
          <Link to="/login" className="text-violet-700 hover:underline">sign in</Link>{" "}
          to submit records.
        </p>
      </Centered>
    );
  }

  const role = user.role.toLowerCase();
  if (role !== "volunteer" && role !== "admin") {
    return <VolunteerAccessGate />;
  }

  // Accounts created before consent was captured at registration must accept
  // the contributor agreement once before submitting anything.
  if (!user.agreed_terms_at && !agreedNow) {
    return <ContributorTermsGate onAgree={() => setAgreedNow(true)} />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Contribute</h1>
      <p className="text-sm text-gray-500 mb-6">
        Submissions go to the edit queue and become public once an admin approves them.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["book", "story", "comic", "magazine", "issue", "person", "publisher", "series"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm px-4 py-1.5 rounded-md border transition-colors ${
              tab === t
                ? "bg-violet-700 text-white border-violet-700"
                : "border-gray-300 text-gray-600 hover:border-violet-400"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "book" && <BookForm />}
      {tab === "story" && <StoryForm />}
      {tab === "comic" && <ComicForm />}
      {tab === "magazine" && <MagazineForm />}
      {tab === "issue" && <MagazineIssueChooser />}
      {tab === "person" && <PersonForm />}
      {tab === "publisher" && <PublisherForm />}
      {tab === "series" && <SeriesForm />}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">{children}</div>
    </div>
  );
}

/**
 * Shown to signed-in USERs who lack volunteer access. Lets them submit a
 * self-service request (with an optional message) and reflects its status.
 */
function VolunteerAccessGate() {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");

  const { data: myRequest, isLoading } = useQuery({
    queryKey: ["my-volunteer-request"],
    queryFn: volunteer.myRequest,
  });

  const submit = useMutation({
    mutationFn: () => volunteer.requestAccess(message.trim() || null),
    onSuccess: (req) => qc.setQueryData(["my-volunteer-request"], req),
  });

  if (isLoading) return null;

  const status = submit.data?.status ?? myRequest?.status;

  if (status === "pending") {
    return (
      <Centered>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Request submitted</h1>
        <p className="text-sm text-gray-500">
          Your request for volunteer access is pending review. We'll upgrade your account once an
          admin approves it.
        </p>
      </Centered>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Become a volunteer</h1>
      <p className="text-sm text-gray-600 leading-relaxed mb-5">
        Contributing new books, people, and publishers needs volunteer access. Request it below and
        an admin will review your account. Submissions are always checked before going live.
      </p>

      {status === "rejected" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-md px-4 py-3 mb-4">
          Your previous request wasn't approved
          {myRequest?.reviewer_note ? `: ${myRequest.reviewer_note}` : "."} You can submit a new
          request below.
        </div>
      )}

      <label className="block text-xs font-semibold text-gray-500 mb-1">
        Message to the admin <span className="font-normal text-gray-400">(optional)</span>
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Tell us a bit about how you'd like to help…"
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4"
      />

      <button
        onClick={() => submit.mutate()}
        disabled={submit.isPending}
        className="bg-violet-700 text-white text-sm px-5 py-2 rounded-md font-medium hover:bg-violet-800 disabled:opacity-40 transition-colors"
      >
        {submit.isPending ? "Submitting…" : "Request volunteer access"}
      </button>
      {submit.isError && (
        <p className="text-sm text-red-500 mt-3">
          Could not submit your request — please try again.
        </p>
      )}
    </div>
  );
}

function ContributorTermsGate({ onAgree }: { onAgree: () => void }) {
  const [checked, setChecked] = useState(false);
  const mutation = useMutation({
    mutationFn: () => auth.agreeTerms(),
    onSuccess: onAgree,
  });

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Contributor agreement</h1>
      <p className="text-sm text-gray-600 leading-relaxed mb-5">
        Before adding records, please accept the contributor terms. You only need to do this once.
      </p>

      <label className="flex items-start gap-2 text-sm text-gray-700 mb-5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-700 focus:ring-violet-500"
        />
        <span>
          I agree that any contribution I make may be published under{" "}
          <Link to="/license" target="_blank" className="text-violet-700 hover:underline">
            CC BY-SA 4.0
          </Link>{" "}
          and that KalpaDB may use, adapt, and relicense it as part of the database.
        </span>
      </label>

      <button
        onClick={() => mutation.mutate()}
        disabled={!checked || mutation.isPending}
        className="bg-violet-700 text-white text-sm px-5 py-2 rounded-md font-medium hover:bg-violet-800 disabled:opacity-40 transition-colors"
      >
        {mutation.isPending ? "Saving…" : "I agree — continue"}
      </button>
      {mutation.isError && (
        <p className="text-sm text-red-500 mt-3">Could not save your agreement — please try again.</p>
      )}
    </div>
  );
}

function PendingBanner() {
  return (
    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3 mb-4">
      Thanks! Your submission is pending admin review.
    </div>
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
        {pending ? "Submitting…" : label}
      </button>
      {error && <span className="text-sm text-red-500">Failed — check fields and try again.</span>}
    </div>
  );
}

// ── Book ────────────────────────────────────────────────────────────────────

function BookForm() {
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: languages } = useQuery({ queryKey: ["all-languages"], queryFn: catalogue.allLanguages });
  const { data: seriesPage } = useQuery({ queryKey: ["all-series"], queryFn: catalogue.series });
  const seriesList = seriesPage?.items ?? [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("bn");
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
  const [contentType, setContentType] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      const y = year ? Number(year) : null;
      // Romanised title is auto-generated by the backend; it can only be
      // overridden later from the edit page.
      return volunteer.submitBook({
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
        credited_as: bylinePayload(authors, bylines),
        editor_ids: editors.map((e) => e.id),
        illustrator_ids: illustrators.map((i) => i.id),
        translator_ids: translators.map((t) => t.id),
        cover_artist_ids: coverArtists.map((c) => c.id),
        publisher_ids: publishers.map((p) => p.id),
        genre_ids: [...genreIds],
        tag_ids: [...tagIds],
        formats: formatRowsToPayload(formats),
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      setTitle("");
      setDescription("");
      setOriginalLanguage("");
      setYear("");
      setAuthors([]);
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
        setSubmitted(false);
        if (title.trim()) mutation.mutate();
      }}
      className="space-y-4"
    >
      {submitted && <PendingBanner />}

      <FormSection title="Basics">
      <div>
        <label className={labelCls}>Title * (Bengali script preferred)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
      </div>
      </FormSection>

      <FormSection title="Publication details">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Work type</label>
          <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={inputCls}>
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
          <select value={originalLanguage} onChange={(e) => setOriginalLanguage(e.target.value)} className={inputCls}>
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
            Is the original also in KalpaDB? Submit this record first — once approved, the two
            works can be linked from its Edit page (“Translations &amp; editions”).
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Series</label>
            <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className={inputCls}>
              <option value="">Not part of a series</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Not listed?{" "}
              <Link to="/series" target="_blank" className="text-violet-600 hover:underline">
                Browse existing series
              </Link>{" "}
              first to avoid duplicates.
            </p>
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

      <div className="grid grid-cols-2 gap-4">
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

      <FormSection title="People & credits">
      <EntityPicker
        label="Authors"
        placeholder="Search persons…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={authors}
        onChange={setAuthors}
      />
      <BylineFields people={authors} bylines={bylines} onChange={setBylines} />

      <EntityPicker
        label="Editors"
        placeholder="Search persons…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={editors}
        onChange={setEditors}
      />

      <EntityPicker
        label="Translators"
        placeholder="Search persons…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={translators}
        onChange={setTranslators}
      />

      <EntityPicker
        label="Illustrators"
        placeholder="Search persons…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={illustrators}
        onChange={setIllustrators}
      />

      <EntityPicker
        label="Cover artists"
        placeholder="Search persons…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={coverArtists}
        onChange={setCoverArtists}
      />

      <EntityPicker
        label="Publishers"
        placeholder="Search publishers…"
        fetchKey="picker-publishers"
        fetcher={(q) => catalogue.publishers(q)}
        selected={publishers}
        onChange={setPublishers}
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

      <SubmitRow pending={mutation.isPending} error={mutation.isError} label="Submit book" />
    </form>
  );
}

// ── Story ───────────────────────────────────────────────────────────────────

function StoryForm() {
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: languages } = useQuery({ queryKey: ["all-languages"], queryFn: catalogue.allLanguages });

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
  const [collection, setCollection] = useState<PickerItem[]>([]);
  const [magIssues, setMagIssues] = useState<IssueRef[]>([]);
  const [firstPub, setFirstPub] = useState<FirstPublishedValue>(emptyFirstPublished);
  const [source, setSource] = useState<SourceAttribution>(emptySourceAttribution());
  const [genreIds, setGenreIds] = useState<Set<number>>(new Set());
  const [tagIds, setTagIds] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      const y = year ? Number(year) : null;
      return volunteer.submitStory({
        title: title.trim(),
        description: description.trim() || null,
        language,
        original_language: originalLanguage || null,
        publication_date: y ? `${y}-01-01` : null,
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
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      setTitle("");
      setDescription("");
      setOriginalLanguage("");
      setYear("");
      setWordCount("");
      setPageCount("");
      setHeadpieceUrl("");
      setAuthors([]);
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
        setSubmitted(false);
        if (title.trim()) mutation.mutate();
      }}
      className="space-y-4"
    >
      {submitted && <PendingBanner />}

      <FormSection title="Basics">
      <div>
        <label className={labelCls}>Title * (native script preferred)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Description / synopsis</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
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
          <select value={originalLanguage} onChange={(e) => setOriginalLanguage(e.target.value)} className={inputCls}>
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
            Is the original also in KalpaDB? Submit this record first — once approved, the two
            works can be linked from its Edit page (“Translations &amp; editions”).
          </p>
        </div>
        <div>
          <label className={labelCls}>Publication year</label>
          <input type="number" min={1000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Word count</label>
          <input type="number" min={1} value={wordCount} onChange={(e) => setWordCount(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Page count</label>
          <input type="number" min={1} value={pageCount} onChange={(e) => setPageCount(e.target.value)} className={inputCls} />
        </div>
      </div>
      </FormSection>

      <FormSection title="People & credits">
      <EntityPicker
        label="Authors"
        placeholder="Search persons…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={authors}
        onChange={setAuthors}
      />
      <BylineFields people={authors} bylines={bylines} onChange={setBylines} />

      <EntityPicker
        label="Translators"
        placeholder="Search persons…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={translators}
        onChange={setTranslators}
      />
      <BylineFields people={translators} bylines={bylines} onChange={setBylines} />
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
            items: r.works.filter((w) => w.type === "BOOK").map((w) => ({ id: w.id, name: w.title })),
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

      <SubmitRow pending={mutation.isPending} error={mutation.isError} label="Submit story" />
    </form>
  );
}

// ── Comic ─────────────────────────────────────────────────────────────────────

function ComicForm() {
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: languages } = useQuery({ queryKey: ["all-languages"], queryFn: catalogue.allLanguages });
  const { data: seriesPage } = useQuery({ queryKey: ["all-series"], queryFn: catalogue.series });
  const seriesList = seriesPage?.items ?? [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("bn");
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
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      const y = year ? Number(year) : null;
      return volunteer.submitComic({
        title: title.trim(),
        description: description.trim() || null,
        language,
        original_language: originalLanguage || null,
        publication_date: y ? `${y}-01-01` : null,
        content_type: "graphic_novel",
        image_urls: coverUrl.trim() ? [coverUrl.trim()] : null,
        writer_ids: writers.map((w) => w.id),
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
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      setTitle("");
      setDescription("");
      setOriginalLanguage("");
      setYear("");
      setReadingDirection("");
      setIsColor("");
      setPageCount("");
      setIsbn("");
      setCoverUrl("");
      setWriters([]);
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

  const creatorPicker = (
    label: string,
    selected: PickerItem[],
    onChange: (v: PickerItem[]) => void
  ) => (
    <EntityPicker
      label={label}
      placeholder="Search persons…"
      fetchKey="picker-persons"
      fetcher={(q) => catalogue.persons(q)}
      selected={selected}
      onChange={onChange}
    />
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(false);
        if (title.trim()) mutation.mutate();
      }}
      className="space-y-4"
    >
      {submitted && <PendingBanner />}

      <FormSection title="Basics">
        <div>
          <label className={labelCls}>Title * (native script preferred)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Description / synopsis</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
        </div>
      </FormSection>

      <FormSection title="Publication details">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
            <select value={originalLanguage} onChange={(e) => setOriginalLanguage(e.target.value)} className={inputCls}>
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
            <input type="number" min={1000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} />
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
            <select value={isColor} onChange={(e) => setIsColor(e.target.value as "" | "yes" | "no")} className={inputCls}>
              <option value="">Unspecified</option>
              <option value="yes">Colour</option>
              <option value="no">Black &amp; white</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Page count</label>
            <input type="number" min={1} value={pageCount} onChange={(e) => setPageCount(e.target.value)} className={inputCls} />
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

      <FormSection title="Creators & credits" hint="Writers double as the comic's authors.">
        {creatorPicker("Writers", writers, setWriters)}
        {creatorPicker("Artists (pencillers)", artists, setArtists)}
        {creatorPicker("Inkers", inkers, setInkers)}
        {creatorPicker("Colorists", colorists, setColorists)}
        {creatorPicker("Letterers", letterers, setLetterers)}
        {creatorPicker("Cover artists", coverArtists, setCoverArtists)}
        {creatorPicker("Translators", translators, setTranslators)}
        {creatorPicker("Editors", editors, setEditors)}
        <EntityPicker
          label="Publishers"
          placeholder="Search publishers…"
          fetchKey="picker-publishers"
          fetcher={(q) => catalogue.publishers(q)}
          selected={publishers}
          onChange={setPublishers}
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

      <SubmitRow pending={mutation.isPending} error={mutation.isError} label="Submit comic" />
    </form>
  );
}

// ── Magazine ────────────────────────────────────────────────────────────────

// Adding an issue needs a parent magazine, so pick one first, then hand off to
// the existing add-issue page (which carries the magazine id in its route).
function MagazineIssueChooser() {
  const navigate = useNavigate();
  const [mag, setMag] = useState<PickerItem[]>([]);
  const magId = mag[0]?.id;
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Adding an issue of an existing magazine. Pick the magazine, then continue to fill in the
        issue. To add a brand-new magazine title instead, use the <strong>Magazine</strong> tab.
      </p>
      <EntityPicker
        label="Magazine"
        placeholder="Search a magazine…"
        fetchKey="contribute-issue-magazine"
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

function MagazineForm() {
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: languages } = useQuery({ queryKey: ["all-languages"], queryFn: catalogue.allLanguages });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("bn");
  const [issn, setIssn] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [ceasedYear, setCeasedYear] = useState("");
  const [statusVal, setStatusVal] = useState<MagazineStatus | "">("");
  const [place, setPlace] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [editorships, setEditorships] = useState<EditorshipRow[]>([]);
  const [frequencies, setFrequencies] = useState<FrequencyRow[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [genreIds, setGenreIds] = useState<Set<number>>(new Set());
  const [tagIds, setTagIds] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      volunteer.submitMagazine({
        title: title.trim(),
        description: description.trim() || null,
        language,
        issn: issn.trim() || null,
        founded_year: foundedYear.trim() ? Number(foundedYear) : null,
        ceased_year: ceasedYear.trim() ? Number(ceasedYear) : null,
        status: statusVal || null,
        place_of_publication: place.trim() || null,
        website_url: websiteUrl.trim() || null,
        editorships: editorshipsToPayload(editorships),
        frequencies: frequenciesToPayload(frequencies),
        image_urls: logoUrl.trim() ? [logoUrl.trim()] : null,
        genre_ids: [...genreIds],
        tag_ids: [...tagIds],
      }),
    onSuccess: () => {
      setSubmitted(true);
      setTitle("");
      setDescription("");
      setIssn("");
      setFoundedYear("");
      setCeasedYear("");
      setStatusVal("");
      setPlace("");
      setWebsiteUrl("");
      setEditorships([]);
      setFrequencies([]);
      setLogoUrl("");
      setGenreIds(new Set());
      setTagIds(new Set());
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(false);
        if (title.trim()) mutation.mutate();
      }}
      className="space-y-4"
    >
      {submitted && <PendingBanner />}

      <FormSection title="Basics">
      <div>
        <label className={labelCls}>Title * (native script preferred)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
        <p className="mt-1 text-xs text-gray-400">
          The magazine title as a whole (e.g. আশ্চর্য!), not a single issue.
        </p>
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Founded (year)</label>
          <input
            type="number"
            value={foundedYear}
            onChange={(e) => setFoundedYear(e.target.value)}
            min={1800}
            max={2100}
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
        <div className="col-span-2">
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
        hint="Editorship history — add a row per editor stint (years optional)."
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
        Translated edition of a magazine that's also in KalpaDB? Submit this record first — once
        approved, the two works can be linked from its Edit page (“Translations”).
      </p>

      <SubmitRow pending={mutation.isPending} error={mutation.isError} label="Submit magazine" />
    </form>
  );
}

// ── Person ──────────────────────────────────────────────────────────────────

function PersonForm() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [nationality, setNationality] = useState("Indian");
  const [roleType, setRoleType] = useState("author");
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [nativeName, setNativeName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [penNames, setPenNames] = useState<PenName[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [dup, setDup] = useState<DuplicateError | null>(null);

  const mutation = useMutation({
    mutationFn: (allowDuplicate: boolean) =>
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
      ),
    onSuccess: () => {
      setSubmitted(true);
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
        setSubmitted(false);
        if (name.trim()) {
          setDup(null);
          mutation.mutate(false);
        }
      }}
      className="space-y-4"
    >
      {submitted && <PendingBanner />}

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
          <select value={roleType} onChange={(e) => setRoleType(e.target.value)} className={inputCls}>
            {["author", "illustrator", "editor", "translator"].map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
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

      <SubmitRow pending={mutation.isPending} error={mutation.isError && !dup} label="Submit person" />
    </form>
  );
}

// ── Publisher ───────────────────────────────────────────────────────────────

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
  const [submitted, setSubmitted] = useState(false);
  const [dup, setDup] = useState<DuplicateError | null>(null);

  const mutation = useMutation({
    mutationFn: (allowDuplicate: boolean) =>
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
      ),
    onSuccess: () => {
      setSubmitted(true);
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
        setSubmitted(false);
        if (name.trim()) {
          setDup(null);
          mutation.mutate(false);
        }
      }}
      className="space-y-4"
    >
      {submitted && <PendingBanner />}

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

      <SubmitRow pending={mutation.isPending} error={mutation.isError && !dup} label="Submit publisher" />
    </form>
  );
}

// ── Series ──────────────────────────────────────────────────────────────────

function SeriesForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      volunteer.submitSeries({
        name: name.trim(),
        slug: slug.trim() || null,
        description: description.trim() || null,
      }),
    onSuccess: () => {
      setSubmitted(true);
      setName("");
      setSlug("");
      setDescription("");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(false);
        if (name.trim()) mutation.mutate();
      }}
      className="space-y-4"
    >
      {submitted && <PendingBanner />}

      <div>
        <label className={labelCls}>Series name *</label>
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

      <SubmitRow pending={mutation.isPending} error={mutation.isError} label="Submit series" />
    </form>
  );
}
