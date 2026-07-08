import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogue, admin, ApiError, type AwardTypeItem, type AwardCategoryItem } from "../../lib/api";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

/**
 * Manage the award taxonomy: create/edit/retire award types and their
 * categories. Mirrors Tag Management. Deletes are guarded server-side (409 if an
 * award still has categories, or a category still has results).
 */
export default function AdminAwards() {
  const qc = useQueryClient();
  const { data: awards, isLoading } = useQuery({
    queryKey: ["award-types"],
    queryFn: () => catalogue.awardTypes(),
  });

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [notes, setNotes] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["award-types"] });

  const createMutation = useMutation({
    mutationFn: () =>
      admin.awards.createType({
        name: name.trim(),
        country: country.trim() || null,
        language: language.trim() || null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      setName("");
      setCountry("");
      setLanguage("");
      setNotes("");
      setFormErr(null);
      invalidate();
    },
    onError: (e) => setFormErr(e instanceof ApiError ? e.message : "Could not create award"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormErr("Name is required.");
      return;
    }
    createMutation.mutate();
  }

  const total = awards?.length ?? 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Award Management</h1>
      <p className="text-sm text-gray-500 mb-6">
        Award types (e.g. Kalpabiswa Award) and their categories (e.g. Best Novel). Results are
        attached to individual works and people from their Edit pages; here you maintain the list
        those pickers draw from.
        {awards && <span className="ml-1 text-gray-400">{total} award{total === 1 ? "" : "s"}.</span>}
      </p>

      {/* Create award type */}
      <form
        onSubmit={submit}
        className="bg-white border border-gray-200 rounded-lg p-4 mb-6 max-w-3xl"
      >
        <p className="text-sm font-semibold text-gray-700 mb-3">Create an award</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kalpabiswa Award"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Country (optional)</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Language (optional)</label>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="bn" className={inputCls} />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Awarding body, scope…" className={inputCls} />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="text-sm px-4 py-2 rounded-md bg-teal-700 text-white disabled:opacity-40 hover:bg-teal-800 transition-colors"
          >
            {createMutation.isPending ? "Creating…" : "Create award"}
          </button>
          {formErr && <span className="text-sm text-red-500">{formErr}</span>}
        </div>
      </form>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <p className="text-gray-400 text-center py-12">No awards yet — create one above.</p>
      ) : (
        <div className="space-y-4">
          {awards!.map((award) => (
            <AwardCard key={award.id} award={award} onChange={invalidate} />
          ))}
        </div>
      )}
    </div>
  );
}

function AwardCard({ award, onChange }: { award: AwardTypeItem; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(award.name);
  const [country, setCountry] = useState(award.country ?? "");
  const [language, setLanguage] = useState(award.language ?? "");
  const [active, setActive] = useState(award.is_active);
  const [newCat, setNewCat] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      admin.awards.updateType(award.id, {
        name: name.trim(),
        country: country.trim() || null,
        language: language.trim() || null,
        is_active: active,
      }),
    onSuccess: () => {
      setEditing(false);
      setErr(null);
      onChange();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Save failed"),
  });

  const delAward = useMutation({
    mutationFn: () => admin.awards.deleteType(award.id),
    onSuccess: () => {
      setErr(null);
      onChange();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Delete failed"),
  });

  const addCat = useMutation({
    mutationFn: () => admin.awards.createCategory(award.id, { name: newCat.trim() }),
    onSuccess: () => {
      setNewCat("");
      setErr(null);
      onChange();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not add category"),
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls + " sm:col-span-2"} />
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className={inputCls} />
          <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Lang" className={inputCls} />
          <label className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active (shown in pickers)
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !name.trim()}
              className="text-sm px-3 py-1.5 rounded-md bg-teal-700 text-white disabled:opacity-40 hover:bg-teal-800"
            >
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="font-semibold text-gray-800">{award.name}</span>
          {!award.is_active && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">retired</span>
          )}
          {award.country && <span className="text-xs text-gray-400">{award.country}</span>}
          {award.language && <span className="text-xs text-gray-400 uppercase">· {award.language}</span>}
          <span className="text-xs text-gray-400">· {award.categories.length} categories</span>
          <span className="ml-auto flex items-center gap-3">
            <button onClick={() => setEditing(true)} className="text-xs text-teal-700 hover:underline">
              Edit
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete award "${award.name}"?`)) delAward.mutate();
              }}
              disabled={delAward.isPending}
              className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40"
            >
              Delete
            </button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {award.categories.map((c) => (
          <CategoryChip key={c.id} awardId={award.id} category={c} onChange={onChange} setErr={setErr} />
        ))}
        {award.categories.length === 0 && <span className="text-xs text-gray-400">No categories yet.</span>}
        <span className="inline-flex items-center gap-1">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="+ category"
            className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400 w-32"
          />
          <button
            onClick={() => newCat.trim() && addCat.mutate()}
            disabled={!newCat.trim() || addCat.isPending}
            className="text-xs text-teal-700 hover:underline disabled:opacity-40"
          >
            Add
          </button>
        </span>
      </div>
      {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
    </div>
  );
}

function CategoryChip({
  awardId,
  category,
  onChange,
  setErr,
}: {
  awardId: number;
  category: AwardCategoryItem;
  onChange: () => void;
  setErr: (s: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);

  const save = useMutation({
    mutationFn: () => admin.awards.updateCategory(awardId, category.id, { name: name.trim() }),
    onSuccess: () => {
      setEditing(false);
      setErr(null);
      onChange();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Save failed"),
  });

  const del = useMutation({
    mutationFn: () => admin.awards.deleteCategory(awardId, category.id),
    onSuccess: () => {
      setErr(null);
      onChange();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Delete failed"),
  });

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 border border-teal-300 rounded-full px-2 py-0.5 bg-teal-50">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-xs bg-transparent focus:outline-none w-24"
          autoFocus
        />
        <button onClick={() => save.mutate()} disabled={!name.trim()} className="text-xs text-teal-700 disabled:opacity-40">
          ✓
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-400">
          ×
        </button>
      </span>
    );
  }

  return (
    <span className="group inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-gray-300 bg-gray-50 text-gray-700">
      {category.name}
      <button
        onClick={() => setEditing(true)}
        title="Rename"
        className="text-gray-300 hover:text-teal-600"
      >
        ✎
      </button>
      <button
        onClick={() => {
          if (window.confirm(`Delete category "${category.name}"?`)) del.mutate();
        }}
        disabled={del.isPending}
        title="Delete"
        className="text-gray-300 hover:text-red-500 disabled:opacity-40"
      >
        ×
      </button>
    </span>
  );
}
