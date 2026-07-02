import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogue, admin, ApiError, type TagNode } from "../../lib/api";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminTags() {
  const qc = useQueryClient();
  const { data: tree, isLoading } = useQuery({ queryKey: ["tag-tree"], queryFn: catalogue.tagTree });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [parentId, setParentId] = useState<number | "">("");
  const [formErr, setFormErr] = useState<string | null>(null);

  const roots = tree ?? [];
  const totalTags = roots.reduce((n, r) => n + 1 + (r.children?.length ?? 0), 0);

  const createMutation = useMutation({
    mutationFn: () =>
      admin.tags.create({
        tag_name: name.trim(),
        slug: slug.trim(),
        parent_tag_id: parentId === "" ? null : Number(parentId),
      }),
    onSuccess: () => {
      setName("");
      setSlug("");
      setSlugEdited(false);
      setParentId("");
      setFormErr(null);
      qc.invalidateQueries({ queryKey: ["tag-tree"] });
      qc.invalidateQueries({ queryKey: ["all-tags"] });
    },
    onError: (e) => setFormErr(e instanceof ApiError ? e.message : "Could not create tag"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setFormErr("Name and slug are required.");
      return;
    }
    createMutation.mutate();
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Tag Management</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tags carry fine-grained subgenres (e.g. Cyberpunk, Kalpavigyan) as a two-level tree, separate
        from the coarse genre list. Assign them to works in{" "}
        <span className="font-medium">Genre &amp; Tag Tagging</span> or on the Add/Edit forms.
        {tree && <span className="ml-1 text-gray-400">{totalTags} tags.</span>}
      </p>

      {/* Create form */}
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 max-w-2xl">
        <p className="text-sm font-semibold text-gray-700 mb-3">Create a tag</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. Cyberpunk"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Slug</label>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="cyberpunk"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Parent</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">— none (top-level) —</option>
              {roots.map((r) => (
                <option key={r.id} value={r.id}>{r.tag_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="text-sm px-4 py-2 rounded-md bg-teal-700 text-white disabled:opacity-40 hover:bg-teal-800 transition-colors"
          >
            {createMutation.isPending ? "Creating…" : "Create tag"}
          </button>
          {formErr && <span className="text-sm text-red-500">{formErr}</span>}
        </div>
      </form>

      {/* Tree */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : roots.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No tags yet — create one above.</p>
      ) : (
        <div className="space-y-4">
          {roots.map((parent) => (
            <div key={parent.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-gray-800">{parent.tag_name}</span>
                <code className="text-xs text-gray-400">{parent.slug}</code>
                <span className="text-xs text-gray-400">· {parent.children?.length ?? 0} children</span>
                <TagDeleteButton tag={parent} />
              </div>
              <div className="flex flex-wrap gap-2">
                {(parent.children ?? []).map((child) => (
                  <span
                    key={child.id}
                    className="group inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-gray-300 bg-gray-50 text-gray-700"
                  >
                    {child.tag_name}
                    {child.localised?.name &&
                      Object.values(child.localised.name).map((v) => (
                        <span key={v} className="text-gray-400">({v})</span>
                      ))}
                    <TagDeleteButton tag={child} compact />
                  </span>
                ))}
                {(parent.children?.length ?? 0) === 0 && (
                  <span className="text-xs text-gray-400">No child tags.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TagDeleteButton({ tag, compact }: { tag: TagNode; compact?: boolean }) {
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);

  const del = useMutation({
    mutationFn: () => admin.tags.delete(tag.id),
    onSuccess: () => {
      setErr(null);
      qc.invalidateQueries({ queryKey: ["tag-tree"] });
      qc.invalidateQueries({ queryKey: ["all-tags"] });
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Delete failed"),
  });

  function onClick() {
    if (!window.confirm(`Delete tag "${tag.tag_name}"?`)) return;
    del.mutate();
  }

  return (
    <>
      <button
        onClick={onClick}
        disabled={del.isPending}
        title={`Delete ${tag.tag_name}`}
        className={
          compact
            ? "text-gray-300 hover:text-red-500 disabled:opacity-40"
            : "ml-auto text-xs text-gray-400 hover:text-red-500 disabled:opacity-40"
        }
      >
        {compact ? "×" : "Delete"}
      </button>
      {err && <span className="text-xs text-red-500 ml-1">{err}</span>}
    </>
  );
}
