import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, catalogue, volunteer, ApiError } from "../../lib/api";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";
const cardCls = "bg-white border border-gray-200 rounded-lg p-5";

/** Lowercase ASCII slug from a name; Bengali/other scripts yield "" → user types one. */
function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminCatalogue() {
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Catalogue</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <SeriesSection />
        <TagSection />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ManageSection
          title="Edit / delete persons"
          placeholder="Search persons…"
          fetcher={(q) => catalogue.persons(q)}
          editPath="/admin/edit-person"
        />
        <ManageSection
          title="Edit / delete publishers"
          placeholder="Search publishers…"
          fetcher={(q) => catalogue.publishers(q)}
          editPath="/admin/edit-publisher"
        />
      </div>
    </div>
  );
}

// ── Series ────────────────────────────────────────────────────────────────────

function SeriesSection() {
  const qc = useQueryClient();
  const { data: seriesPage } = useQuery({ queryKey: ["all-series"], queryFn: catalogue.series });
  const series = seriesPage?.items ?? [];

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const sub = await volunteer.submitSeries({
        name: name.trim(),
        slug: slug.trim() || null,
        description: description.trim() || null,
      });
      return admin.queue.review(sub.edit_id, true, "Direct admin entry");
    },
    onSuccess: () => {
      setName("");
      setSlug("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["all-series"] });
    },
  });

  const del = useMutation({
    mutationFn: (id: number) => admin.series.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-series"] }),
  });

  return (
    <div className={cardCls}>
      <h2 className="font-semibold text-gray-900 mb-4">Book series</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
        className="space-y-3 mb-5"
      >
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
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={create.isPending}
            className="bg-violet-700 text-white text-sm px-4 py-1.5 rounded-md font-medium hover:bg-violet-800 disabled:opacity-40"
          >
            {create.isPending ? "Adding…" : "Add series"}
          </button>
          {create.isError && <span className="text-sm text-red-500">Failed — check the slug.</span>}
        </div>
      </form>

      {series.length === 0 ? (
        <p className="text-sm text-gray-400">No series yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 text-sm">
          {series.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <span className="text-gray-700">{s.name}</span>
              <DeleteButton onConfirm={() => del.mutate(s.id)} pending={del.isPending} />
            </li>
          ))}
        </ul>
      )}
      {del.isError && <p className="text-sm text-red-500 mt-2">Delete failed.</p>}
    </div>
  );
}

// ── Tags ──────────────────────────────────────────────────────────────────────

function TagSection() {
  const qc = useQueryClient();
  const { data: tags } = useQuery({ queryKey: ["all-tags"], queryFn: catalogue.allTags });

  const [tagName, setTagName] = useState("");
  const [slug, setSlug] = useState("");

  const create = useMutation({
    mutationFn: () => admin.tags.create({ tag_name: tagName.trim(), slug: slug.trim() }),
    onSuccess: () => {
      setTagName("");
      setSlug("");
      qc.invalidateQueries({ queryKey: ["all-tags"] });
    },
  });

  const err =
    create.error instanceof ApiError && create.error.status === 409
      ? "That slug is already in use."
      : create.isError
        ? "Failed — slug must be lowercase letters, numbers and hyphens."
        : null;

  return (
    <div className={cardCls}>
      <h2 className="font-semibold text-gray-900 mb-4">Tags</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (tagName.trim() && slug.trim()) create.mutate();
        }}
        className="space-y-3 mb-5"
      >
        <div>
          <label className={labelCls}>Tag name *</label>
          <input
            value={tagName}
            onChange={(e) => {
              setTagName(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Slug * (lowercase, hyphens)</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            pattern="[a-z0-9\-]+"
            title="Lowercase letters, numbers and hyphens only."
            placeholder="e.g. cyberpunk"
            className={inputCls}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={create.isPending}
            className="bg-violet-700 text-white text-sm px-4 py-1.5 rounded-md font-medium hover:bg-violet-800 disabled:opacity-40"
          >
            {create.isPending ? "Adding…" : "Add tag"}
          </button>
          {err && <span className="text-sm text-red-500">{err}</span>}
        </div>
      </form>

      {(tags ?? []).length === 0 ? (
        <p className="text-sm text-gray-400">No tags yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(tags ?? []).map((t) => (
            <span key={t.id} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
              {t.tag_name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Manage persons / publishers (search → edit) ────────────────────────────────

function ManageSection({
  title,
  placeholder,
  fetcher,
  editPath,
}: {
  title: string;
  placeholder: string;
  fetcher: (q: string) => Promise<{ items: { id: number; name: string }[] }>;
  editPath: string;
}) {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["manage-search", title, q],
    queryFn: () => fetcher(q.trim()),
    enabled: q.trim().length >= 1,
  });
  const results = data?.items ?? [];

  return (
    <div className={cardCls}>
      <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
      {q.trim().length >= 1 && (
        <ul className="border border-gray-200 rounded-md mt-2 divide-y divide-gray-100 max-h-60 overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">No matches.</li>
          ) : (
            results.map((r) => (
              <li key={r.id}>
                <Link
                  to={`${editPath}/${r.id}`}
                  className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-violet-50"
                >
                  <span>{r.name}</span>
                  <span className="text-xs text-violet-600">Edit →</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ── Two-step delete button ──────────────────────────────────────────────────────

function DeleteButton({ onConfirm, pending }: { onConfirm: () => void; pending: boolean }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm) onConfirm();
        else setConfirm(true);
      }}
      onBlur={() => setConfirm(false)}
      className={`text-xs px-2.5 py-1 rounded-md border transition-colors disabled:opacity-40 ${
        confirm
          ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
          : "border-red-300 text-red-600 hover:bg-red-50"
      }`}
    >
      {pending ? "Deleting…" : confirm ? "Confirm delete" : "Delete"}
    </button>
  );
}
