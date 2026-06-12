import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, catalogue, volunteer, works, type WorkDetail, type BookUpdateIn } from "../../lib/api";
import EntityPicker, { type PickerItem } from "../../components/EntityPicker";
import { WORLD_LANGUAGES } from "../../lib/languages";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

const FORMAT_TYPES = ["paperback", "hardcover", "ebook"];

const AVAILABILITY_OPTIONS = [
  { value: "", label: "Unknown" },
  { value: "in_print", label: "In print" },
  { value: "out_of_print", label: "Out of print" },
  { value: "digital_only", label: "Digital only" },
  { value: "rare", label: "Rare" },
];

export default function AdminEditBook() {
  const { id } = useParams<{ id: string }>();
  const { data: work, isLoading } = useQuery({
    queryKey: ["work", id],
    queryFn: () => works.get(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-gray-400 py-12 text-center">Loading book…</div>;
  }
  if (!work) {
    return <div className="text-gray-400 py-12 text-center">Book not found.</div>;
  }
  if (work.type !== "BOOK") {
    return (
      <div className="text-gray-400 py-12 text-center">
        Only BOOK works can be edited here (this is {work.type}).
      </div>
    );
  }
  return <EditForm key={work.id} work={work} />;
}

function EditForm({ work }: { work: WorkDetail }) {
  const qc = useQueryClient();
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: allTags } = useQuery({ queryKey: ["all-tags"], queryFn: catalogue.allTags });
  const { data: seriesPage } = useQuery({ queryKey: ["all-series"], queryFn: catalogue.series });
  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });
  const seriesList = seriesPage?.items ?? [];

  const [title, setTitle] = useState(work.title);
  const [description, setDescription] = useState(work.description ?? "");
  const [language, setLanguage] = useState(work.language ?? "bn");
  const [originalLanguage, setOriginalLanguage] = useState(work.original_language ?? "");
  const [year, setYear] = useState(
    work.book?.publication_year?.toString() ??
      (work.publication_date ? work.publication_date.slice(0, 4) : "")
  );
  const [authors, setAuthors] = useState<PickerItem[]>(
    work.authors.map((a) => ({ id: a.id, name: a.name }))
  );
  const [publishers, setPublishers] = useState<PickerItem[]>(
    (work.book?.publishers ?? []).map((p) => ({ id: p.id, name: p.name }))
  );
  const [genreIds, setGenreIds] = useState<Set<number>>(
    new Set(work.genres.map((g) => g.id))
  );
  const [coverUrl, setCoverUrl] = useState(
    work.image_urls?.[0] ?? work.book?.formats?.[0]?.cover_image_url ?? ""
  );
  const [tagIds, setTagIds] = useState<Set<number>>(new Set(work.tags.map((t) => t.id)));
  const [seriesId, setSeriesId] = useState(work.book?.series_id?.toString() ?? "");
  const [seriesPosition, setSeriesPosition] = useState(
    work.book?.series_position?.toString() ?? ""
  );
  const [editionLabel, setEditionLabel] = useState(work.book?.edition_label ?? "");
  const [editionNotes, setEditionNotes] = useState(work.book?.edition_notes ?? "");
  const firstFormat = work.book?.formats?.[0] ?? null;
  const [formatType, setFormatType] = useState(firstFormat?.format_type ?? "paperback");
  const [isbn, setIsbn] = useState(firstFormat?.isbn ?? "");
  const [pageCount, setPageCount] = useState(firstFormat?.page_count?.toString() ?? "");
  const [availability, setAvailability] = useState(firstFormat?.availability ?? "");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const navigate = useNavigate();

  const deleteMutation = useMutation({
    mutationFn: () => admin.works.delete(work.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["works"] });
      qc.invalidateQueries({ queryKey: ["genres"] });
      qc.removeQueries({ queryKey: ["work", String(work.id)] });
      navigate("/admin/tagging");
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const y = year ? Number(year) : null;

      // Replace-semantics: edit the first format in place (preserving fields the
      // form doesn't expose) and pass any further formats through untouched.
      let formats: BookUpdateIn["formats"];
      if (firstFormat || isbn.trim() || pageCount || availability) {
        formats = [
          {
            format_type: formatType,
            isbn: isbn.trim() || null,
            page_count: pageCount ? Number(pageCount) : null,
            availability: availability || null,
            publication_date: firstFormat?.publication_date ?? null,
            cover_image_url: firstFormat?.cover_image_url ?? null,
            price: firstFormat?.price ?? null,
            currency: firstFormat?.currency ?? null,
            notes: firstFormat?.notes ?? null,
          },
          ...(work.book?.formats ?? []).slice(1).map((f) => ({
            format_type: f.format_type,
            isbn: f.isbn,
            page_count: f.page_count,
            availability: f.availability,
            publication_date: f.publication_date,
            cover_image_url: f.cover_image_url,
            price: f.price,
            currency: f.currency,
            notes: f.notes,
          })),
        ];
      }

      const sub = await volunteer.updateBook(work.id, {
        formats,
        title: title.trim(),
        description: description.trim() || null,
        language,
        original_language: originalLanguage || null,
        publication_year: y,
        publication_date: y ? `${y}-01-01` : null,
        author_ids: authors.map((a) => a.id),
        publisher_ids: publishers.map((p) => p.id),
        genre_ids: [...genreIds],
        tag_ids: [...tagIds],
        series_id: seriesId ? Number(seriesId) : null,
        series_position: seriesPosition ? Number(seriesPosition) : null,
        edition_label: editionLabel.trim() || null,
        edition_notes: editionNotes.trim() || null,
        // empty list clears the work-level cover (null would mean "no change")
        image_urls: coverUrl.trim() ? [coverUrl.trim()] : [],
      });
      return admin.queue.review(sub.edit_id, true, "Direct admin edit");
    },
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["work", String(work.id)] });
      qc.invalidateQueries({ queryKey: ["works"] });
      qc.invalidateQueries({ queryKey: ["genres"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        if (title.trim()) mutation.mutate();
      }}
      className="max-w-2xl space-y-4"
    >
      <h1 className="text-xl font-bold text-gray-900">
        Edit Book
        <span className="ml-2 text-sm font-normal text-gray-400">#{work.id}</span>
      </h1>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3">
          Saved.{" "}
          <Link to={`/works/${work.id}`} className="underline font-medium">
            View book →
          </Link>
        </div>
      )}

      <div>
        <label className={labelCls}>Title *</label>
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

      <div className="grid grid-cols-3 gap-4">
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Edition label</label>
          <input
            value={editionLabel}
            onChange={(e) => setEditionLabel(e.target.value)}
            placeholder="e.g. First Edition, Revised"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Edition notes</label>
          <input
            value={editionNotes}
            onChange={(e) => setEditionNotes(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {seriesList.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Series</label>
            <select
              value={seriesId}
              onChange={(e) => setSeriesId(e.target.value)}
              className={inputCls}
            >
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

      <div>
        <label className={labelCls}>Cover image URL</label>
        <div className="flex gap-3 items-start">
          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
          {coverUrl.trim() && (
            <img
              src={coverUrl.trim()}
              alt="Cover preview"
              className="w-12 rounded shadow shrink-0"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          )}
        </div>
      </div>

      <EntityPicker
        label="Authors"
        placeholder="Search persons…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={authors}
        onChange={setAuthors}
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

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className={labelCls}>Format</label>
          <select value={formatType} onChange={(e) => setFormatType(e.target.value)} className={inputCls}>
            {FORMAT_TYPES.map((f) => (
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
            ))}
            {firstFormat && !FORMAT_TYPES.includes(firstFormat.format_type) && (
              <option value={firstFormat.format_type}>{firstFormat.format_type}</option>
            )}
          </select>
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
        <div>
          <label className={labelCls}>Availability</label>
          <select
            value={availability ?? ""}
            onChange={(e) => setAvailability(e.target.value)}
            className={inputCls}
          >
            {AVAILABILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
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

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-violet-700 text-white text-sm px-5 py-2 rounded-md font-medium hover:bg-violet-800 disabled:opacity-40 transition-colors"
        >
          {mutation.isPending ? "Saving…" : "Save changes"}
        </button>
        <Link to={`/works/${work.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </Link>
        {mutation.isError && (
          <span className="text-sm text-red-500">Save failed — try again.</span>
        )}

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
              : "Delete book"}
        </button>
        {deleteMutation.isError && (
          <span className="text-sm text-red-500">Delete failed.</span>
        )}
      </div>
    </form>
  );
}
