import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import {
  auth,
  catalogue,
  volunteer,
  getDuplicateError,
  type DuplicateError,
  type GenreItem,
} from "../lib/api";
import EntityPicker, { type PickerItem } from "../components/EntityPicker";
import FormatsEditor, {
  type FormatRow,
  emptyFormatRow,
  formatRowsToPayload,
} from "../components/FormatsEditor";
import SourceAttributionFields, {
  type SourceAttribution,
  emptySourceAttribution,
  sourceAttributionPayload,
} from "../components/SourceAttributionFields";
import DuplicateMatchPrompt from "../components/DuplicateMatchPrompt";
import ImageUploadField from "../components/ImageUploadField";
import PenNamesField, { type PenName } from "../components/PenNamesField";
import { WORLD_LANGUAGES } from "../lib/languages";
import { WORK_TYPE_OPTIONS } from "../lib/workTypes";

type Tab = "book" | "person" | "publisher" | "series";

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
        {(["book", "person", "publisher", "series"] as Tab[]).map((t) => (
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
  const { data: allTags } = useQuery({ queryKey: ["all-tags"], queryFn: catalogue.allTags });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("bn");
  const [originalLanguage, setOriginalLanguage] = useState("");
  const [year, setYear] = useState("");
  const [authors, setAuthors] = useState<PickerItem[]>([]);
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

      <div>
        <label className={labelCls}>Title * (Bengali script preferred)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
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

      <FormatsEditor value={formats} onChange={setFormats} />

      <SourceAttributionFields value={source} onChange={setSource} />

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

      <ImageUploadField
        label="Cover image"
        category="covers"
        value={coverUrl}
        onChange={(url) => setCoverUrl(url ?? "")}
      />

      <EntityPicker
        label="Authors"
        placeholder="Search persons…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={authors}
        onChange={setAuthors}
      />

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

      {(allTags ?? []).length > 0 && (
        <div>
          <label className={labelCls}>Tags</label>
          <div className="flex flex-wrap gap-2">
            {(allTags ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setTagIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(t.id)) next.delete(t.id);
                    else next.add(t.id);
                    return next;
                  })
                }
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  tagIds.has(t.id)
                    ? "bg-violet-700 text-white border-violet-700"
                    : "bg-white border-gray-300 text-gray-600 hover:border-violet-400"
                }`}
              >
                {t.tag_name}
              </button>
            ))}
          </div>
        </div>
      )}

      <SubmitRow pending={mutation.isPending} error={mutation.isError} label="Submit book" />
    </form>
  );
}

// ── Person ──────────────────────────────────────────────────────────────────

function PersonForm() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [nationality, setNationality] = useState("Indian");
  const [roleType, setRoleType] = useState("author");
  const [birthDate, setBirthDate] = useState("");
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
          birth_date: birthDate || null,
          image_url: imageUrl.trim() || null,
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
      setBirthDate("");
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

      <div>
        <label className={labelCls}>Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
      </div>

      <div className="grid grid-cols-3 gap-4">
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
      </div>

      <div>
        <label className={labelCls}>Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={inputCls} />
      </div>

      <PenNamesField value={penNames} onChange={setPenNames} />

      <ImageUploadField
        label="Image"
        category="people"
        value={imageUrl}
        onChange={(url) => setImageUrl(url ?? "")}
      />

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
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
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
          website: website.trim() || null,
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
        },
        allowDuplicate,
      ),
    onSuccess: () => {
      setSubmitted(true);
      setDup(null);
      setName("");
      setCity("");
      setFoundedYear("");
      setWebsite("");
      setDescription("");
      setImageUrl("");
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

      <div>
        <label className={labelCls}>Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Country code</label>
          <input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={10} className={inputCls} />
        </div>
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
      </div>

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

      <SubmitRow pending={mutation.isPending} error={mutation.isError && !dup} label="Submit publisher" />
    </form>
  );
}

// ── Series ──────────────────────────────────────────────────────────────────

function SeriesForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      volunteer.submitSeries({
        name: name.trim(),
        description: description.trim() || null,
      }),
    onSuccess: () => {
      setSubmitted(true);
      setName("");
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
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
      </div>

      <SubmitRow pending={mutation.isPending} error={mutation.isError} label="Submit series" />
    </form>
  );
}
