import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, catalogue, volunteer, works, type WorkDetail } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { type PickerItem } from "../../components/EntityPicker";
import { bylinePayload } from "../../components/BylineFields";
import ImageUploadField from "../../components/ImageUploadField";
import ContributorGate from "../../components/ContributorGate";
import EditNoteField from "../../components/EditNoteField";
import TranslationLinksEditor from "../../components/TranslationLinksEditor";
import AwardsEditor from "../../components/AwardsEditor";
import ExternalLinksEditor from "../../components/ExternalLinksEditor";
import WorkRelationshipsEditor from "../../components/WorkRelationshipsEditor";
import FormSection from "../../components/FormSection";
import MediaCreditsEditor, {
  type CreditRow,
  creditPeople,
  creditRowsFromExisting,
  creditRowsToPayload,
} from "../../components/MediaCreditsEditor";
import MediaAdaptationsEditor, {
  type AdaptationRow,
  adaptationRowsFromExisting,
  adaptationRowsToPayload,
} from "../../components/MediaAdaptationsEditor";
import MediaSeasonsEditor, {
  type SeasonRow,
  seasonRowsFromExisting,
  seasonRowsToPayload,
} from "../../components/MediaSeasonsEditor";
import CountrySelect from "../../components/CountrySelect";
import TagChipPicker from "../../components/TagChipPicker";
import EditSavedBanner from "../../components/EditSavedBanner";
import ClearedFieldsPrompt from "../../components/ClearedFieldsPrompt";
import { findClearedFields, type ClearedField } from "../../lib/clearedFields";
import { WORLD_LANGUAGES } from "../../lib/languages";
import { MEDIA_TYPE_OPTIONS, EPISODIC_MEDIA_TYPES } from "../../lib/workTypes";

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

export default function AdminEditMedia() {
  const { id } = useParams<{ id: string }>();
  const { data: work, isLoading } = useQuery({
    queryKey: ["work", id],
    queryFn: () => works.get(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-gray-400 py-12 text-center">Loading media work…</div>;
  }
  if (!work) {
    return <div className="text-gray-400 py-12 text-center">Media work not found.</div>;
  }
  if (work.type !== "MEDIA") {
    return (
      <div className="text-gray-400 py-12 text-center">
        Only MEDIA works can be edited here (this is {work.type}).
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

  const { data: languages } = useQuery({
    queryKey: ["all-languages"],
    queryFn: catalogue.allLanguages,
  });
  const { data: allGenres } = useQuery({ queryKey: ["all-genres"], queryFn: catalogue.allGenres });

  const media = work.media;
  const [title, setTitle] = useState(work.title);
  const [description, setDescription] = useState(work.description ?? "");
  const [language, setLanguage] = useState(work.language ?? "bn");
  const [contentType, setContentType] = useState(work.content_type ?? "film");
  // Romanised (Latin) title — auto-generated, editable; pins a manual override.
  const initialRoman = work.localised?.title?.[`${work.language ?? "bn"}-Latn`] ?? "";
  const [roman, setRoman] = useState(initialRoman);
  const [originalLanguage, setOriginalLanguage] = useState(work.original_language ?? "");
  const [year, setYear] = useState(work.publication_date ? work.publication_date.slice(0, 4) : "");
  const [runtime, setRuntime] = useState(media?.runtime_minutes?.toString() ?? "");
  const [platform, setPlatform] = useState(media?.platform ?? "");
  const [productionHouse, setProductionHouse] = useState(media?.production_house ?? "");
  const [country, setCountry] = useState(media?.country_of_origin ?? "");
  const [ageRating, setAgeRating] = useState(media?.age_rating ?? "");
  const [posterUrl, setPosterUrl] = useState(work.image_urls?.[0] ?? "");
  const [credits, setCredits] = useState<CreditRow[]>(
    creditRowsFromExisting(media?.credits ?? [], work.content_type ?? "film")
  );
  // Byline overrides per credited person ("credited as", e.g. a screen name).
  // One map for the whole work: a byline applies to every credit that person holds.
  const [bylines, setBylines] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const c of media?.credits ?? []) {
      if (c.credited_as && !init[c.stakeholder.id]) init[c.stakeholder.id] = c.credited_as;
    }
    return init;
  });
  const [adaptations, setAdaptations] = useState<AdaptationRow[]>(
    adaptationRowsFromExisting(media?.adaptations ?? [])
  );
  const [seasons, setSeasons] = useState<SeasonRow[]>(seasonRowsFromExisting(media?.seasons ?? []));
  const [genreIds, setGenreIds] = useState<Set<number>>(new Set(work.genres.map((g) => g.id)));
  const [tagIds, setTagIds] = useState<Set<number>>(new Set(work.tags.map((t) => t.id)));
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingClears, setPendingClears] = useState<ClearedField[] | null>(null);

  const episodic = EPISODIC_MEDIA_TYPES.has(contentType);

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
      const seasonPayload = episodic ? seasonRowsToPayload(seasons) : [];
      const episodeCounts = seasonPayload.map((s) => s.episode_count);

      const sub = await volunteer.updateMedia(
        work.id,
        {
          title: title.trim(),
          description: description.trim() || null,
          language,
          localised,
          content_type: contentType,
          original_language: originalLanguage || null,
          publication_date: y ? `${y}-01-01` : null,
          image_urls: posterUrl.trim() ? [posterUrl.trim()] : [],
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
          label: "Release year",
          previous: work.publication_date ? work.publication_date.slice(0, 4) : null,
          next: year || null,
        },
        { label: "Runtime", previous: media?.runtime_minutes, next: runtime ? Number(runtime) : null },
        { label: "Platform", previous: media?.platform, next: platform.trim() || null },
        {
          label: "Production house",
          previous: media?.production_house,
          next: productionHouse.trim() || null,
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
      className="max-w-2xl space-y-4"
    >
      <h1 className="text-xl font-bold text-gray-900">
        Edit Media Work
        <span className="ml-2 text-sm font-normal text-gray-400">#{work.id}</span>
      </h1>

      {saved && (
        <EditSavedBanner isAdmin={!!isAdmin} viewHref={`/works/${work.id}`} viewLabel="View work" />
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
          onCreatePerson={isAdmin ? createPersonInline : undefined}
          admin={!!isAdmin}
        />
      </FormSection>

      <FormSection
        title="Based on (adaptations)"
        hint="Link the catalogued book/story this work adapts. The source work's page shows it under Adaptations."
      >
        <MediaAdaptationsEditor rows={adaptations} onChange={setAdaptations} selfId={work.id} />
      </FormSection>

      <FormSection
        title="Translations & dubs"
        hint="Link this work to its dubbed/translated version or the original in another language."
      >
        <TranslationLinksEditor workId={work.id} workLanguage={work.language} isAdmin={!!isAdmin} />
      </FormSection>

      <FormSection
        title="Related works"
        hint="Link sequels, prequels, spin-offs, or remakes. Saved immediately, separately from the fields above."
      >
        <WorkRelationshipsEditor work={work} />
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

      <FormSection
        title="Awards & external links"
        hint="Saved immediately, separately from the fields above. Use link type “trailer” for the trailer and “watch” for the streaming/listen page — they appear as buttons on the public page."
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
                : "Delete media work"}
          </button>
        )}
        {isAdmin && deleteMutation.isError && (
          <span className="text-sm text-red-500">Delete failed.</span>
        )}
      </div>
    </form>
  );
}
