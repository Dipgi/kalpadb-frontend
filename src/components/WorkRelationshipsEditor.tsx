import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, search, volunteer, type WorkDetail } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { relationLabel, relationOptionsFor, type RelationType } from "../lib/relations";
import EntityPicker, { type PickerItem } from "./EntityPicker";

/**
 * Directional relationships between this work and others — sequels, prequels,
 * spin-offs, retellings, and (for magazines) serial continues/continued-by.
 * Adds go through the edit-log queue (auto-approved for admins); deletes are
 * admin-only and immediate. Existing links are read from work.related_works,
 * which already includes both directions (object-side ones shown inverted).
 */
export default function WorkRelationshipsEditor({ work }: { work: WorkDetail }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";
  // Admins and trusted volunteers write live; others queue for review.
  const applied = isAdmin || !!user?.auto_approve;

  const options = relationOptionsFor(work.type);
  const [other, setOther] = useState<PickerItem | null>(null);
  const [direction, setDirection] = useState<RelationType>(options[0]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Serial links pick from magazines only; narrative links from any work.
  const magazineOnly = work.type === "MAGAZINE";

  function refresh() {
    qc.invalidateQueries({ queryKey: ["work", String(work.id)] });
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!other) throw new Error("Pick a work");
      const sub = await volunteer.addWorkRelationship(work.id, {
        other_work_id: other.id,
        direction,
        notes: notes.trim() || null,
      });
      if (isAdmin) await admin.queue.review(sub.edit_id, true, "Direct admin edit");
      return sub;
    },
    onSuccess: () => {
      setOther(null);
      setNotes("");
      setSubmitted(true);
      if (applied) refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (relId: number) => admin.relationships.delete(relId),
    onSuccess: refresh,
  });

  return (
    <div>
      {work.related_works.length > 0 && (
        <ul className="text-sm divide-y divide-gray-100 border border-gray-100 rounded-md mb-3">
          {work.related_works.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-3 py-2">
              <span className="text-gray-700">
                <span className="text-gray-400">{relationLabel(r.relation_type)}: </span>
                {r.work.title}
                {r.notes && <span className="text-gray-400 text-xs"> — {r.notes}</span>}
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(r.id)}
                  disabled={deleteMutation.isPending}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50 shrink-0 ml-3"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="border border-gray-100 rounded-md p-3 space-y-2 bg-gray-50/50">
        <EntityPicker
          label={magazineOnly ? "Linked magazine" : "Linked work"}
          placeholder={magazineOnly ? "Search a magazine…" : "Search a work…"}
          fetchKey={magazineOnly ? "picker-magazines" : "picker-works"}
          fetcher={(q) =>
            search.query(q).then((r) => ({
              items: r.works
                .filter((w) => w.id !== work.id && (!magazineOnly || w.type === "MAGAZINE"))
                .map((w) => ({ id: w.id, name: w.title })),
            }))
          }
          selected={other ? [other] : []}
          onChange={(items) => {
            setOther(items[items.length - 1] ?? null);
            setSubmitted(false);
          }}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-gray-400 mb-0.5">Relationship</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as RelationType)}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {options.map((d) => (
                <option key={d} value={d}>
                  {relationLabel(d)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-0.5">Note (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. set 200 years later"
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => addMutation.mutate()}
            disabled={!other || addMutation.isPending}
            className="text-sm bg-violet-700 text-white px-4 py-1.5 rounded-md hover:bg-violet-800 disabled:opacity-40 transition-colors"
          >
            {addMutation.isPending ? "Saving…" : applied ? "Add link" : "Submit link for review"}
          </button>
          {addMutation.isError && (
            <span className="text-sm text-red-500">Couldn’t add — try again.</span>
          )}
          {submitted && !applied && (
            <span className="text-sm text-emerald-600">Submitted for review.</span>
          )}
        </div>
      </div>
    </div>
  );
}
