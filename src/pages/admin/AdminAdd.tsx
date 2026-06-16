import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  admin,
  catalogue,
  volunteer,
  getDuplicateError,
  type DuplicateError,
  type EditSubmission,
  type GenreItem,
} from "../../lib/api";
import EntityPicker, { type PickerItem } from "../../components/EntityPicker";
import DuplicateMatchPrompt from "../../components/DuplicateMatchPrompt";
import ImageUploadField from "../../components/ImageUploadField";
import { WORLD_LANGUAGES } from "../../lib/languages";

type Tab = "book" | "person" | "publisher";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

/** Submit via the volunteer pipeline, then auto-approve as admin. */
async function submitAndApprove(submit: () => Promise<EditSubmission>) {
  const sub = await submit();
  return admin.queue.review(sub.edit_id, true, "Direct admin entry");
}

/** Inline-create a person (name only) and return it as a picker item. */
async function createPersonInline(
  name: string,
  opts?: { allowDuplicate?: boolean },
): Promise<PickerItem> {
  const entry = await submitAndApprove(() =>
    volunteer.submitPerson({ name }, opts?.allowDuplicate),
  );
  return { id: entry.record_id!, name };
}

/** Inline-create a publisher (name only) and return it as a picker item. */
async function createPublisherInline(
  name: string,
  opts?: { allowDuplicate?: boolean },
): Promise<PickerItem> {
  const entry = await submitAndApprove(() =>
    volunteer.submitPublisher({ name }, opts?.allowDuplicate),
  );
  return { id: entry.record_id!, name };
}

export default function AdminAdd() {
  const [tab, setTab] = useState<Tab>("book");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Add Records</h1>

      <div className="flex gap-2 mb-6">
        {(["book", "person", "publisher"] as Tab[]).map((t) => (
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
    </div>
  );
}

// ── Success banner ──────────────────────────────────────────────────────────

function SuccessBanner({ message, link, linkText }: { message: string; link?: string; linkText?: string }) {
  return (
    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3 mb-4">
      {message}{" "}
      {link && (
        <Link to={link} className="underline font-medium">
          {linkText ?? "View →"}
        </Link>
      )}
    </div>
  );
}

// ── Book form ───────────────────────────────────────────────────────────────

const FORMAT_TYPES = ["paperback", "hardcover", "ebook"];

const AVAILABILITY_OPTIONS = [
  { value: "", label: "Unknown" },
  { value: "in_print", label: "In print" },
  { value: "out_of_print", label: "Out of print" },
  { value: "digital_only", label: "Digital only" },
  { value: "rare", label: "Rare" },
];

function BookForm() {
  const qc = useQueryClient();
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });
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
  const [formatType, setFormatType] = useState("paperback");
  const [availability, setAvailability] = useState("");
  const [isbn, setIsbn] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("");
  const [formatNotes, setFormatNotes] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [seriesPosition, setSeriesPosition] = useState("");
  const [editionLabel, setEditionLabel] = useState("");
  const [editionNotes, setEditionNotes] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [createdId, setCreatedId] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const y = year ? Number(year) : null;
      const hasFormat = isbn || pageCount || coverUrl || availability || price || currency || formatNotes;
      return submitAndApprove(() =>
        volunteer.submitBook({
          title: title.trim(),
          description: description.trim() || null,
          language,
          original_language: originalLanguage || null,
          publication_year: y,
          publication_date: y ? `${y}-01-01` : null,
          series_id: seriesId ? Number(seriesId) : null,
          series_position: seriesPosition ? Number(seriesPosition) : null,
          edition_label: editionLabel.trim() || null,
          edition_notes: editionNotes.trim() || null,
          image_urls: coverUrl.trim() ? [coverUrl.trim()] : null,
          author_ids: authors.map((a) => a.id),
          editor_ids: editors.map((e) => e.id),
          illustrator_ids: illustrators.map((i) => i.id),
          translator_ids: translators.map((t) => t.id),
          cover_artist_ids: coverArtists.map((c) => c.id),
          publisher_ids: publishers.map((p) => p.id),
          genre_ids: [...genreIds],
          tag_ids: [...tagIds],
          formats: hasFormat
            ? [
                {
                  format_type: formatType,
                  isbn: isbn.trim() || null,
                  page_count: pageCount ? Number(pageCount) : null,
                  cover_image_url: coverUrl.trim() || null,
                  availability: availability || null,
                  price: price.trim() || null,
                  currency: currency.trim() || null,
                  notes: formatNotes.trim() || null,
                },
              ]
            : [],
        })
      );
    },
    onSuccess: (entry) => {
      setCreatedId(entry.record_id);
      qc.invalidateQueries({ queryKey: ["works"] });
      qc.invalidateQueries({ queryKey: ["genres"] });
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
      setAvailability("");
      setIsbn("");
      setPageCount("");
      setPrice("");
      setCurrency("");
      setFormatNotes("");
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
        if (title.trim()) mutation.mutate();
      }}
      className="max-w-2xl space-y-4"
    >
      {createdId != null && (
        <SuccessBanner message="Book created." link={`/works/${createdId}`} linkText="View book →" />
      )}

      <div>
        <label className={labelCls}>Title * (Bengali script preferred)</label>
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
        <div>
          <label className={labelCls}>Pages</label>
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Format</label>
          <select value={formatType} onChange={(e) => setFormatType(e.target.value)} className={inputCls}>
            {FORMAT_TYPES.map((f) => (
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Availability</label>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className={inputCls}
          >
            {AVAILABILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Price</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 250" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Currency</label>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="e.g. INR" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Format notes</label>
          <input value={formatNotes} onChange={(e) => setFormatNotes(e.target.value)} className={inputCls} />
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
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={authors}
        onChange={setAuthors}
        onCreate={createPersonInline}
      />

      <EntityPicker
        label="Editors"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={editors}
        onChange={setEditors}
        onCreate={createPersonInline}
      />

      <EntityPicker
        label="Translators"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={translators}
        onChange={setTranslators}
        onCreate={createPersonInline}
      />

      <EntityPicker
        label="Illustrators"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={illustrators}
        onChange={setIllustrators}
        onCreate={createPersonInline}
      />

      <EntityPicker
        label="Cover artists"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={coverArtists}
        onChange={setCoverArtists}
        onCreate={createPersonInline}
      />

      <EntityPicker
        label="Publishers"
        placeholder="Search or create a publisher…"
        fetchKey="picker-publishers"
        fetcher={(q) => catalogue.publishers(q)}
        selected={publishers}
        onChange={setPublishers}
        onCreate={createPublisherInline}
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

      <SubmitRow pending={mutation.isPending} error={mutation.isError} label="Create book" />
    </form>
  );
}

// ── Person form ─────────────────────────────────────────────────────────────

function PersonForm() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [nationality, setNationality] = useState("Indian");
  const [roleType, setRoleType] = useState("author");
  const [birthDate, setBirthDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
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
            birth_date: birthDate || null,
            image_url: imageUrl.trim() || null,
          },
          allowDuplicate,
        )
      ),
    onSuccess: (entry) => {
      setCreatedId(entry.record_id);
      setDup(null);
      setName("");
      setBio("");
      setBirthDate("");
      setImageUrl("");
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

      <div>
        <label className={labelCls}>Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Role</label>
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

      <ImageUploadField
        label="Image"
        category="people"
        value={imageUrl}
        onChange={(url) => setImageUrl(url ?? "")}
      />

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
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
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
            website: website.trim() || null,
            description: description.trim() || null,
            image_url: imageUrl.trim() || null,
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

      <SubmitRow pending={mutation.isPending} error={mutation.isError && !dup} label="Create publisher" />
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
