import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, type NewsPost } from "../../lib/api";

const EMPTY = { title: "", body: "", summary: "", status: "draft", pinned: false };

export default function AdminNews() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<NewsPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-news", page],
    queryFn: () => admin.news.list(page),
  });

  const createMutation = useMutation({
    mutationFn: () => admin.news.create({
      title: form.title,
      body: form.body,
      summary: form.summary || undefined,
      status: form.status,
      pinned: form.pinned,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-news"] });
      setCreating(false);
      setForm(EMPTY);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => admin.news.update(editing!.id, {
      title: form.title,
      body: form.body,
      summary: form.summary || undefined,
      status: form.status,
      pinned: form.pinned,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-news"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => admin.news.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-news"] }),
  });

  async function openEdit(post: NewsPost) {
    setLoadingEdit(true);
    setCreating(false);
    try {
      const full = await admin.news.get(post.id);
      setEditing(full);
      setForm({
        title: full.title,
        body: full.body ?? "",
        summary: full.summary ?? "",
        status: full.status,
        pinned: full.pinned,
      });
    } finally {
      setLoadingEdit(false);
    }
  }

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setForm(EMPTY);
  }

  const showForm = creating || !!editing;
  const isPending = createMutation.isPending || updateMutation.isPending || loadingEdit;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">News</h1>
        {!showForm && (
          <button
            onClick={openCreate}
            className="text-sm bg-violet-700 text-white px-4 py-1.5 rounded-md hover:bg-violet-800 transition-colors"
          >
            + New Post
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {editing ? "Edit Post" : "New Post"}
          </h2>
          <div className="space-y-3">
            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <input
              placeholder="Summary (optional)"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <textarea
              placeholder="Body (markdown supported)"
              rows={6}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
            />
            <div className="flex items-center gap-4">
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
                  className="rounded"
                />
                Pinned
              </label>
            </div>
            <div className="flex gap-2">
              <button
                disabled={!form.title.trim() || !form.body.trim() || isPending}
                onClick={() => (editing ? updateMutation.mutate() : createMutation.mutate())}
                className="text-sm bg-violet-700 text-white px-4 py-1.5 rounded-md hover:bg-violet-800 disabled:opacity-60 transition-colors"
              >
                {isPending ? "Saving…" : editing ? "Save Changes" : "Create Post"}
              </button>
              <button
                onClick={() => { setEditing(null); setCreating(false); }}
                className="text-sm border border-gray-200 px-4 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <p className="text-gray-400 text-center py-16">No posts yet.</p>
      ) : (
        <div className="space-y-2">
          {data!.items.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
            >
              <div>
                <span className="text-sm font-medium text-gray-800">{post.title}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    post.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {post.status}
                  </span>
                  {post.pinned && (
                    <span className="text-xs text-violet-600">📌 pinned</span>
                  )}
                  {post.published_at && (
                    <span className="text-xs text-gray-400">
                      {new Date(post.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={loadingEdit}
                  onClick={() => openEdit(post)}
                  className="text-xs text-violet-700 hover:underline disabled:opacity-50"
                >
                  {loadingEdit ? "Loading…" : "Edit"}
                </button>
                <button
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete "${post.title}"?`)) deleteMutation.mutate(post.id);
                  }}
                  className="text-xs text-red-500 hover:underline disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">{page} / {data.pages}</span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
