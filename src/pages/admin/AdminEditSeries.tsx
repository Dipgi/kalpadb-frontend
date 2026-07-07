import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, catalogue, volunteer, ApiError, type BookSeriesOut } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import ContributorGate from "../../components/ContributorGate";
import EditNoteField from "../../components/EditNoteField";
import EditSavedBanner from "../../components/EditSavedBanner";
import ClearedFieldsPrompt from "../../components/ClearedFieldsPrompt";
import { findClearedFields, type ClearedField } from "../../lib/clearedFields";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

export default function AdminEditSeries() {
  const { id } = useParams<{ id: string }>();
  const { data: series, isLoading } = useQuery({
    queryKey: ["series", id],
    queryFn: () => catalogue.seriesDetail(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-gray-400 py-12 text-center">Loading series…</div>;
  if (!series) return <div className="text-gray-400 py-12 text-center">Series not found.</div>;
  return (
    <ContributorGate>
      <EditForm key={series.id} series={series} />
    </ContributorGate>
  );
}

function EditForm({ series }: { series: BookSeriesOut }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";

  const [name, setName] = useState(series.name);
  const [slug, setSlug] = useState(series.slug ?? "");
  const [description, setDescription] = useState(series.description ?? "");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingClears, setPendingClears] = useState<ClearedField[] | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const sub = await volunteer.updateSeries(
        series.id,
        {
          name: name.trim(),
          slug: slug.trim() || null,
          description: description.trim() || null,
        },
        isAdmin ? undefined : note,
      );
      if (isAdmin) await admin.queue.review(sub.edit_id, true, "Direct admin edit");
      return sub;
    },
    onSuccess: () => {
      setSaved(true);
      setPendingClears(null);
      if (isAdmin) {
        qc.invalidateQueries({ queryKey: ["series", String(series.id)] });
        qc.invalidateQueries({ queryKey: ["series-list"] });
      }
    },
  });

  // Admin blanks clear the field; warn (once) before saving. Volunteers' blanks
  // are left unchanged by the backend, so no warning is needed.
  function attemptSave() {
    setSaved(false);
    if (!name.trim()) return;
    if (isAdmin) {
      const cleared = findClearedFields([
        { label: "Slug", previous: series.slug, next: slug.trim() || null },
        { label: "Description", previous: series.description, next: description.trim() || null },
      ]);
      if (cleared.length) {
        setPendingClears(cleared);
        return;
      }
    }
    mutation.mutate();
  }

  const deleteMutation = useMutation({
    mutationFn: () => admin.series.delete(series.id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["series", String(series.id)] });
      navigate("/series");
    },
  });

  const deleteErr =
    deleteMutation.error instanceof ApiError && deleteMutation.error.status === 409
      ? "Still linked to works — unlink them first."
      : deleteMutation.isError
        ? "Delete failed."
        : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        attemptSave();
      }}
      className="max-w-2xl space-y-4"
    >
      <h1 className="text-xl font-bold text-gray-900">
        Edit Series
        <span className="ml-2 text-sm font-normal text-gray-400">#{series.id}</span>
      </h1>

      {pendingClears && (
        <ClearedFieldsPrompt
          fields={pendingClears}
          onConfirm={() => mutation.mutate()}
          onCancel={() => setPendingClears(null)}
          busy={mutation.isPending}
        />
      )}

      {saved && (
        <EditSavedBanner
          isAdmin={!!isAdmin}
          viewHref={`/series/${series.id}`}
          viewLabel="View series"
        />
      )}

      <div>
        <label className={labelCls}>Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Slug (lowercase, hyphens)</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          pattern="[a-z0-9\-]*"
          className={inputCls}
        />
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

      <p className="text-xs text-gray-400">
        {isAdmin
          ? "Clearing a field removes its current value — you'll be asked to confirm before saving."
          : "Leaving a field blank keeps its current value (it won't clear it)."}
      </p>

      <EditNoteField show={!isAdmin} value={note} onChange={setNote} />

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
        <Link
          to={`/series/${series.id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
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
                : "Delete series"}
          </button>
        )}
      </div>
      {isAdmin && deleteErr && <p className="text-sm text-red-500 text-right">{deleteErr}</p>}
    </form>
  );
}
