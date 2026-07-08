import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, volunteer, type ExternalLinkItem } from "../lib/api";

type Target = { kind: "work"; id: number } | { kind: "person"; id: number };

const LINK_TYPES = ["goodreads", "wikipedia", "worldcat", "openlibrary", "other"];

const inputCls =
  "w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-[11px] text-gray-400 mb-0.5";

/**
 * Add / edit / remove external reference links (Goodreads, Wikipedia, …) for a
 * work or person. Adds and edits go through the review queue (auto-approved for
 * admins); removals are admin-only and immediate. Existing links are passed in
 * from the parent's detail query.
 */
export default function ExternalLinksEditor({
  target,
  links,
  isAdmin,
}: {
  target: Target;
  links: ExternalLinkItem[];
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [submittedNote, setSubmittedNote] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  function refresh() {
    if (target.kind === "work") qc.invalidateQueries({ queryKey: ["work", String(target.id)] });
    else qc.invalidateQueries({ queryKey: ["person", String(target.id)] });
  }

  const deleteMutation = useMutation({
    mutationFn: (linkId: number) => admin.links.delete(linkId),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-3">
      {links.length > 0 && (
        <ul className="text-sm divide-y divide-gray-100 border border-gray-100 rounded-md">
          {links.map((l) =>
            editingId === l.id ? (
              <li key={l.id} className="px-3 py-3 bg-violet-50/40">
                <LinkForm
                  initial={l}
                  submitLabel={isAdmin ? "Save changes" : "Submit changes for review"}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (values) => {
                    const sub = await volunteer.updateLink(l.id, values);
                    if (isAdmin) await admin.queue.review(sub.edit_id, true, "Direct admin edit");
                    setEditingId(null);
                    if (isAdmin) refresh();
                    else setSubmittedNote(true);
                  }}
                />
              </li>
            ) : (
              <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-gray-700 min-w-0 truncate">
                  <span className="text-[11px] uppercase tracking-wide text-violet-600 font-semibold mr-2">
                    {l.link_type}
                  </span>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {l.label || l.url}
                  </a>
                </span>
                <span className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(l.id);
                      setSubmittedNote(false);
                    }}
                    className="text-xs text-violet-600 hover:underline"
                  >
                    Edit
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(l.id)}
                      disabled={deleteMutation.isPending}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </span>
              </li>
            )
          )}
        </ul>
      )}

      <div className="border border-gray-100 rounded-md p-3 bg-gray-50/50">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Add a link
        </p>
        <LinkForm
          submitLabel={isAdmin ? "Add link" : "Submit link for review"}
          resetOnSubmit
          onSubmit={async (values) => {
            const sub =
              target.kind === "work"
                ? await volunteer.addWorkLink(target.id, values)
                : await volunteer.addPersonLink(target.id, values);
            if (isAdmin) await admin.queue.review(sub.edit_id, true, "Direct admin edit");
            if (isAdmin) refresh();
            else setSubmittedNote(true);
          }}
        />
      </div>

      {submittedNote && !isAdmin && (
        <p className="text-xs text-emerald-600">
          Submitted for review — it’ll appear here once an admin approves it.
        </p>
      )}
    </div>
  );
}

interface LinkValues {
  link_type: string;
  url: string;
  label: string | null;
}

function LinkForm({
  initial,
  submitLabel,
  resetOnSubmit,
  onCancel,
  onSubmit,
}: {
  initial?: ExternalLinkItem;
  submitLabel: string;
  resetOnSubmit?: boolean;
  onCancel?: () => void;
  onSubmit: (values: LinkValues) => Promise<void>;
}) {
  const [linkType, setLinkType] = useState(initial?.link_type ?? "other");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const u = url.trim();
      if (!u) throw new Error("Enter a URL");
      await onSubmit({ link_type: linkType, url: u, label: label.trim() || null });
    },
    onSuccess: () => {
      if (resetOnSubmit) {
        setLinkType("other");
        setUrl("");
        setLabel("");
      }
    },
  });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-2">
        <div>
          <label className={labelCls}>Type</label>
          <select value={linkType} onChange={(e) => setLinkType(e.target.value)} className={inputCls}>
            {LINK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Label (optional)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Tamil Wikipedia, Publisher page"
          className={inputCls}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!url.trim() || mutation.isPending}
          className="text-sm bg-violet-700 text-white px-4 py-1.5 rounded-md hover:bg-violet-800 disabled:opacity-40 transition-colors"
        >
          {mutation.isPending ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:underline">
            Cancel
          </button>
        )}
        {mutation.isError && (
          <span className="text-sm text-red-500">
            {(mutation.error as Error)?.message || "Couldn’t save — try again."}
          </span>
        )}
      </div>
    </div>
  );
}
