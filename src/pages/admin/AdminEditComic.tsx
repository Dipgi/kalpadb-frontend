import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, catalogue, volunteer, works, type WorkDetail } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import EntityPicker, { type PickerItem } from "../../components/EntityPicker";
import BylineFields, { bylinePayload } from "../../components/BylineFields";
import ImageUploadField from "../../components/ImageUploadField";
import ContributorGate from "../../components/ContributorGate";
import EditNoteField from "../../components/EditNoteField";
import TranslationLinksEditor from "../../components/TranslationLinksEditor";
import AwardsEditor from "../../components/AwardsEditor";
import ExternalLinksEditor from "../../components/ExternalLinksEditor";
import WorkRelationshipsEditor from "../../components/WorkRelationshipsEditor";
import FormSection from "../../components/FormSection";
import FormatsEditor, {
  type FormatRow,
  formatRowsFromExisting,
  formatRowsToPayload,
  COMIC_FORMAT_TYPES,
} from "../../components/FormatsEditor";
import TagChipPicker from "../../components/TagChipPicker";
import EditSavedBanner from "../../components/EditSavedBanner";
import ClearedFieldsPrompt from "../../components/ClearedFieldsPrompt";
import { findClearedFields, type ClearedField } from "../../lib/clearedFields";
import { WORLD_LANGUAGES } from "../../lib/languages";
import { COMIC_TYPE_OPTIONS } from "../../lib/workTypes";
import { createPersonInline, createPublisherInline } from "../../lib/inlineCreate";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

export default function AdminEditComic() {
  const { id } = useParams<{ id: string }>();
  const { data: work, isLoading } = useQuery({
    queryKey: ["work", id],
    queryFn: () => works.get(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-gray-400 py-12 text-center">Loading comic…</div>;
  }
  if (!work) {
    return <div className="text-gray-400 py-12 text-center">Comic not found.</div>;
  }
  if (work.type !== "COMIC") {
    return (
      <div className="text-gray-400 py-12 text-center">
        Only COMIC works can be edited here (this is {work.type}).
      </div>
    );
  }
  return (
    <ContributorGate>
      <EditForm key={work.id} work={work} />
    </ContributorGate>
  );
}

function toItems(people: { id: number; name: string }[]): PickerItem[] {
  return people.map((p) => ({ id: p.id, name: p.name }));
}

function EditForm({ work }: { work: WorkDetail }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";
  const canInlineCreate = isAdmin || !!user?.auto_approve;
  const navigate = useNavigate();
  const [note, setNote] = useState("");

  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });
  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });
  const { data: seriesPage } = useQuery({ queryKey: ["all-series"], queryFn: catalogue.series });
  const seriesList = seriesPage?.items ?? [];

  const comic = work.comic;
  const [title, setTitle] = useState(work.title);
  const [description, setDescription] = useState(work.description ?? "");
  const [language, setLanguage] = useState(work.language ?? "bn");
  const [contentType, setContentType] = useState(work.content_type ?? "graphic_novel");
  // Romanised (Latin) title — auto-generated, editable; pins a manual override.
  const initialRoman = work.localised?.title?.[`${work.language ?? "bn"}-Latn`] ?? "";
  const [roman, setRoman] = useState(initialRoman);
  const [originalLanguage, setOriginalLanguage] = useState(work.original_language ?? "");
  const [year, setYear] = useState(work.publication_date ? work.publication_date.slice(0, 4) : "");
  const [readingDirection, setReadingDirection] = useState<"" | "ltr" | "rtl">(
    (comic?.reading_direction as "ltr" | "rtl" | null) ?? ""
  );
  const [isColor, setIsColor] = useState<"" | "yes" | "no">(
    comic?.is_color == null ? "" : comic.is_color ? "yes" : "no"
  );
  const [pageCount, setPageCount] = useState(comic?.page_count?.toString() ?? "");
  const [isbn, setIsbn] = useState(comic?.isbn ?? "");
  const [seriesId, setSeriesId] = useState(comic?.series_id?.toString() ?? "");
  const [seriesPosition, setSeriesPosition] = useState(comic?.series_position?.toString() ?? "");
  const [seriesPositionLabel, setSeriesPositionLabel] = useState(
    comic?.series_position_label ?? ""
  );
  const [coverUrl, setCoverUrl] = useState(work.image_urls?.[0] ?? "");
  const [writers, setWriters] = useState<PickerItem[]>(toItems(comic?.writers ?? []));
  const [artists, setArtists] = useState<PickerItem[]>(toItems(comic?.artists ?? []));
  const [inkers, setInkers] = useState<PickerItem[]>(toItems(comic?.inkers ?? []));
  const [colorists, setColorists] = useState<PickerItem[]>(toItems(comic?.colorists ?? []));
  const [letterers, setLetterers] = useState<PickerItem[]>(toItems(comic?.letterers ?? []));
  const [coverArtists, setCoverArtists] = useState<PickerItem[]>(toItems(comic?.cover_artists ?? []));
  const [translators, setTranslators] = useState<PickerItem[]>(toItems(comic?.translators ?? []));
  const [editors, setEditors] = useState<PickerItem[]>(toItems(comic?.editors ?? []));
  const [publishers, setPublishers] = useState<PickerItem[]>(
    (comic?.publishers ?? []).map((p) => ({ id: p.id, name: p.name }))
  );
  // Byline overrides per credited person ("credited as", e.g. a pen name).
  // One map for the whole comic: a byline applies to every role that person holds.
  const [bylines, setBylines] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    const credits = [
      ...(comic?.writers ?? []),
      ...(comic?.artists ?? []),
      ...(comic?.inkers ?? []),
      ...(comic?.colorists ?? []),
      ...(comic?.letterers ?? []),
      ...(comic?.cover_artists ?? []),
      ...(comic?.translators ?? []),
      ...(comic?.editors ?? []),
    ];
    for (const c of credits) if (c.credited_as && !init[c.id]) init[c.id] = c.credited_as;
    return init;
  });
  const [formats, setFormats] = useState<FormatRow[]>(formatRowsFromExisting(comic?.formats));
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
      const romanChanged = roman.trim() !== initialRoman.trim();
      const localised =
        romanChanged && roman.trim()
          ? { title: { [`${language}-Latn`]: roman.trim() } }
          : undefined;

      const sub = await volunteer.updateComic(
        work.id,
        {
          title: title.trim(),
          description: description.trim() || null,
          language,
          localised,
          content_type: contentType || null,
          original_language: originalLanguage || null,
          publication_date: y ? `${y}-01-01` : null,
          reading_direction: readingDirection || null,
          is_color: isColor === "" ? null : isColor === "yes",
          page_count: pageCount ? Number(pageCount) : null,
          isbn: isbn.trim() || null,
          series_id: seriesId ? Number(seriesId) : null,
          series_position: seriesPosition ? Number(seriesPosition) : null,
          series_position_label: seriesPositionLabel.trim() || null,
          formats: formatRowsToPayload(formats, true, false),
          image_urls: coverUrl.trim() ? [coverUrl.trim()] : [],
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
        { label: "Page count", previous: comic?.page_count, next: pageCount ? Number(pageCount) : null },
        { label: "ISBN", previous: comic?.isbn, next: isbn.trim() || null },
      ]);
      if (cleared.length) {
        setPendingClears(cleared);
        return;
      }
    }
    mutation.mutate();
  }

  const creatorPicker = (
    label: string,
    selected: PickerItem[],
    onChange: (v: PickerItem[]) => void
  ) => (
    <div>
      <EntityPicker
        label={label}
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.personPicker(q)}
        selected={selected}
        onChange={onChange}
        onCreate={canInlineCreate ? createPersonInline : undefined}
      />
      <BylineFields people={selected} bylines={bylines} onChange={setBylines} admin />
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        attemptSave();
      }}
      className="max-w-2xl space-y-4"
    >
      <h1 className="text-xl font-bold text-gray-900">
        Edit Comic
        <span className="ml-2 text-sm font-normal text-gray-400">#{work.id}</span>
      </h1>

      {saved && (
        <EditSavedBanner isAdmin={!!isAdmin} viewHref={`/works/${work.id}`} viewLabel="View comic" />
      )}

      <FormSection title="Basics">
        <div>
          <label className={labelCls}>Title * (native script preferred)</label>
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

      <FormSection
        title="Series & issue"
        hint="Link this comic to a series (create the series first under Add → Series) and set its issue number."
      >
        {seriesList.length === 0 ? (
          <p className="text-xs text-gray-400">
            No series exist yet. Create one under Add → Series, then link it here.
          </p>
        ) : (
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
        )}
      </FormSection>

      <FormSection title="Formats" hint="Print/digital editions (single issue, trade paperback, omnibus, digital…).">
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
          placeholder="Search or create a publisher…"
          fetchKey="picker-publishers"
          fetcher={(q) => catalogue.publishers(q)}
          selected={publishers}
          onChange={setPublishers}
          onCreate={canInlineCreate ? createPublisherInline : undefined}
        />
      </FormSection>

      <FormSection
        title="Translations"
        hint="Link this comic to its translation or original in another language."
      >
        <TranslationLinksEditor workId={work.id} workLanguage={work.language} isAdmin={!!isAdmin} />
      </FormSection>

      <FormSection
        title="Related works"
        hint="Link sequels, prequels, spin-offs, retellings, or fix-ups. Saved immediately, separately from the fields above."
      >
        <WorkRelationshipsEditor work={work} />
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
                : "Delete comic"}
          </button>
        )}
        {isAdmin && deleteMutation.isError && (
          <span className="text-sm text-red-500">Delete failed.</span>
        )}
      </div>
    </form>
  );
}
