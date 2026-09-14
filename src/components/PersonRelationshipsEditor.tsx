import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, catalogue, volunteer } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import {
  PERSON_RELATIONS,
  personRelationFrom,
  personRelationLabel,
  type PersonRelationType,
} from "../lib/personRelations";
import EntityPicker, { type PickerItem } from "./EntityPicker";
import { PersonLink } from "./PersonLink";

/**
 * Directional relationships between this person and others — pen names,
 * collective pseudonyms, mentorships, and biographical ties (spouse/parent/
 * sibling). Adds go through the edit-log queue (auto-approved for admins);
 * deletes are admin-only and immediate. Relationships are fetched separately
 * (not embedded on Person) since either side can name this person as subject
 * or object. New links always go in public (no is_public toggle here) — the
 * GET endpoint this reads from only ever returns is_public rows, so a
 * private one created elsewhere wouldn't be manageable from this editor.
 */
export default function PersonRelationshipsEditor({ personId }: { personId: number }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";
  const applied = isAdmin || !!user?.auto_approve;

  const { data: relationships } = useQuery({
    queryKey: ["person-relationships", personId],
    queryFn: () => catalogue.personRelationships(personId),
  });

  const [other, setOther] = useState<PickerItem | null>(null);
  const [relationType, setRelationType] = useState<PersonRelationType>(PERSON_RELATIONS[0]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["person-relationships", personId] });
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!other) throw new Error("Pick a person");
      const sub = await volunteer.addPersonRelationship(personId, {
        other_person_id: other.id,
        relation_type: relationType,
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
    mutationFn: (relId: number) => admin.relationships.deletePerson(relId),
    onSuccess: refresh,
  });

  return (
    <div>
      {relationships && relationships.length > 0 && (
        <ul className="text-sm divide-y divide-gray-100 border border-gray-100 rounded-md mb-3">
          {relationships.map((r) => {
            const linkedPerson = r.subject_id === personId ? r.object_stakeholder : r.subject;
            const fromHere = personRelationFrom(r.relation_type, personId, r.subject_id);
            return (
              <li key={r.id} className="flex items-center justify-between px-3 py-2">
                <span className="text-gray-700">
                  <span className="text-gray-400">{personRelationLabel(fromHere)}: </span>
                  <PersonLink person={linkedPerson} />
                  {r.notes && <span className="text-gray-400 text-xs"> — {r.notes}</span>}
                  {!r.is_public && (
                    <span className="text-gray-400 text-xs italic"> (private)</span>
                  )}
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
            );
          })}
        </ul>
      )}

      <div className="border border-gray-100 rounded-md p-3 space-y-2 bg-gray-50/50">
        <EntityPicker
          label="Linked person"
          placeholder="Search a person…"
          fetchKey="picker-persons"
          fetcher={(q) =>
            catalogue
              .personPicker(q)
              .then((res) => ({ items: res.items.filter((p) => p.id !== personId) }))
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
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as PersonRelationType)}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {PERSON_RELATIONS.map((d) => (
                <option key={d} value={d}>
                  {personRelationLabel(d)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-0.5">Note (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. co-wrote under this name 1978–1985"
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
