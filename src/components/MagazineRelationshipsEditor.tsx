import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, search, volunteer, type WorkDetail } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import EntityPicker, { type PickerItem } from "./EntityPicker";

type Direction = "continues" | "continued_by";

const DIRECTION_LABEL: Record<Direction, string> = {
  continues: "Continues (predecessor)",
  continued_by: "Continued by (successor)",
};

/**
 * Predecessor/successor links between magazine titles (serial rename/merge).
 * Adds go through the edit-log queue (auto-approved for admins); deletes are
 * admin-only and immediate. Existing links are read from work.related_works.
 */
export default function MagazineRelationshipsEditor({ work }: { work: WorkDetail }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";

  const [other, setOther] = useState<PickerItem | null>(null);
  const [direction, setDirection] = useState<Direction>("continues");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const existing = work.related_works.filter(
    (r) => r.relation_type === "continues" || r.relation_type === "continued_by"
  );

  function refresh() {
    qc.invalidateQueries({ queryKey: ["work", String(work.id)] });
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!other) throw new Error("Pick a magazine");
      const sub = await volunteer.addMagazineRelationship(work.id, {
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
      if (isAdmin) refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (relId: number) => admin.relationships.delete(relId),
    onSuccess: refresh,
  });

  return (
    <div>
      {existing.length > 0 && (
        <ul className="text-sm divide-y divide-gray-100 border border-gray-100 rounded-md mb-3">
          {existing.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-3 py-2">
              <span className="text-gray-700">
                <span className="text-gray-400">
                  {r.relation_type === "continues" ? "Continues: " : "Continued by: "}
                </span>
                {r.work.title}
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(r.id)}
                  disabled={deleteMutation.isPending}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
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
          label="Linked magazine"
          placeholder="Search a magazine…"
          fetchKey="picker-magazines"
          fetcher={(q) =>
            search.query(q).then((r) => ({
              items: r.works
                .filter((w) => w.type === "MAGAZINE" && w.id !== work.id)
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
              onChange={(e) => setDirection(e.target.value as Direction)}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {(Object.keys(DIRECTION_LABEL) as Direction[]).map((d) => (
                <option key={d} value={d}>
                  {DIRECTION_LABEL[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-0.5">Note (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. renamed after 1971"
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
            {addMutation.isPending ? "Saving…" : isAdmin ? "Add link" : "Submit link for review"}
          </button>
          {addMutation.isError && (
            <span className="text-sm text-red-500">Couldn’t add — try again.</span>
          )}
          {submitted && !isAdmin && (
            <span className="text-sm text-emerald-600">Submitted for review.</span>
          )}
        </div>
      </div>
    </div>
  );
}
