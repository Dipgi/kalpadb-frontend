import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, catalogue, volunteer, works, type WorkDetail } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import ContributorGate from "../../components/ContributorGate";
import ImageUploadField from "../../components/ImageUploadField";
import EditNoteField from "../../components/EditNoteField";
import EditSavedBanner from "../../components/EditSavedBanner";
import ClearedFieldsPrompt from "../../components/ClearedFieldsPrompt";
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
  const { data: allTags } = useQuery({ queryKey: ["all-tags"], queryFn: catalogue.allTags });
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
  const [frequency, setFrequency] = useState(work.magazine_detail?.publication_frequency ?? "");
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
          publication_frequency: frequency.trim() || null,
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
          label: "Frequency",
          previous: work.magazine_detail?.publication_frequency,
          next: frequency.trim() || null,
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
        Edit Magazine
        <span className="ml-2 text-sm font-normal text-gray-400">#{work.id}</span>
      </h1>

      {saved && (
        <EditSavedBanner isAdmin={!!isAdmin} viewHref={`/works/${work.id}`} viewLabel="View magazine" />
      )}

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
          <label className={labelCls}>Frequency</label>
          <input
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="e.g. monthly, quarterly"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>ISSN</label>
          <input value={issn} onChange={(e) => setIssn(e.target.value)} className={inputCls} />
        </div>
      </div>

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
                  {i.issue_number ?? `Issue #${i.m_issue_id}`}
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
