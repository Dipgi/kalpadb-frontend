import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  catalogue,
  admin,
  volunteer,
  type AwardTypeItem,
  type WorkAward,
  type PersonAward,
} from "../lib/api";

/** Target the editor is attached to — a literary work or a person. */
type Target = { kind: "work"; id: number } | { kind: "person"; id: number };

/** Common shape both work-awards and person-awards normalise to for display + edit. */
interface Row {
  id: number;
  awardName: string | null;
  categoryName: string;
  categoryId: number;
  year: number;
  result: string;
  notes: string | null;
}

const RESULTS = [
  "winner",
  "shortlist",
  "longlist",
  "nominee",
  "special mention",
  "honorary",
];

const inputCls =
  "w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-[11px] text-gray-400 mb-0.5";

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Add / edit / remove structured award results for a work or a person.
 * Adds and edits go through the review queue (auto-approved for admins);
 * removals are admin-only and immediate. Award types + categories come from the
 * seeded controlled list; admins can create a new type/category inline.
 */
export default function AwardsEditor({
  target,
  isAdmin,
}: {
  target: Target;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [submittedNote, setSubmittedNote] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const existingKey =
    target.kind === "work"
      ? ["work-awards", target.id]
      : ["person-awards", target.id];

  const { data: awardTypes } = useQuery({
    queryKey: ["award-types"],
    queryFn: () => catalogue.awardTypes(),
  });

  const { data: rawRows } = useQuery<WorkAward[] | PersonAward[]>({
    queryKey: existingKey,
    queryFn: () =>
      target.kind === "work"
        ? catalogue.workAwards(target.id)
        : catalogue.personAwards(target.id),
  });

  const rows: Row[] = useMemo(() => {
    if (!rawRows) return [];
    if (target.kind === "work") {
      return (rawRows as Awaited<ReturnType<typeof catalogue.workAwards>>).map((a) => ({
        id: a.id,
        awardName: a.award,
        categoryName: a.category.name,
        categoryId: a.category.id,
        year: a.year,
        result: a.result,
        notes: a.notes,
      }));
    }
    // On a person, personAwards() also rolls up awards won by their works; those
    // belong to the work and are managed on the work's page, so don't list them
    // as editable here — only awards given to the person directly.
    return (rawRows as Awaited<ReturnType<typeof catalogue.personAwards>>)
      .filter((a) => !a.for_work)
      .map((a) => ({
        id: a.id,
        awardName: a.award,
        categoryName: a.category,
        categoryId: a.category_id,
        year: a.year,
        result: a.result,
        notes: a.notes,
      }));
  }, [rawRows, target.kind]);

  function refresh() {
    qc.invalidateQueries({ queryKey: existingKey });
    if (target.kind === "work") qc.invalidateQueries({ queryKey: ["work", String(target.id)] });
  }

  const deleteMutation = useMutation({
    mutationFn: (resultId: number) => admin.awards.deleteResult(resultId),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <ul className="text-sm divide-y divide-gray-100 border border-gray-100 rounded-md">
          {rows.map((r) =>
            editingId === r.id ? (
              <li key={r.id} className="px-3 py-3 bg-violet-50/40">
                <AwardForm
                  awardTypes={awardTypes ?? []}
                  isAdmin={isAdmin}
                  initial={r}
                  submitLabel={isAdmin ? "Save changes" : "Submit changes for review"}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (values) => {
                    const sub = await volunteer.updateAward(r.id, {
                      category_id: values.categoryId,
                      year: values.year,
                      result: values.result,
                      notes: values.notes,
                    });
                    if (isAdmin) await admin.queue.review(sub.edit_id, true, "Direct admin edit");
                    setEditingId(null);
                    if (isAdmin) refresh();
                    else setSubmittedNote(true);
                  }}
                />
              </li>
            ) : (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-gray-700 min-w-0">
                  {r.awardName && <span className="font-medium">{r.awardName} — </span>}
                  {r.categoryName} <span className="text-gray-400">({r.year})</span> — {r.result}
                  {r.notes && <span className="text-gray-400"> · {r.notes}</span>}
                </span>
                <span className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(r.id);
                      setSubmittedNote(false);
                    }}
                    className="text-xs text-violet-600 hover:underline"
                  >
                    Edit
                  </button>
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
                </span>
              </li>
            )
          )}
        </ul>
      )}

      <div className="border border-gray-100 rounded-md p-3 bg-gray-50/50">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Add an award
        </p>
        <AwardForm
          awardTypes={awardTypes ?? []}
          isAdmin={isAdmin}
          submitLabel={isAdmin ? "Add award" : "Submit award for review"}
          resetOnSubmit
          onSubmit={async (values) => {
            const payload = {
              category_id: values.categoryId,
              year: values.year,
              result: values.result,
              notes: values.notes,
            };
            const sub =
              target.kind === "work"
                ? await volunteer.addWorkAward(target.id, payload)
                : await volunteer.addPersonAward(target.id, payload);
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

interface FormValues {
  categoryId: number;
  year: number;
  result: string;
  notes: string | null;
}

/** The add/edit row form — award type → category selects plus year/result/notes. */
function AwardForm({
  awardTypes,
  isAdmin,
  initial,
  submitLabel,
  resetOnSubmit,
  onCancel,
  onSubmit,
}: {
  awardTypes: AwardTypeItem[];
  isAdmin: boolean;
  initial?: Row;
  submitLabel: string;
  resetOnSubmit?: boolean;
  onCancel?: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const qc = useQueryClient();

  // Find the award type that owns the initial category, so edit prefills both selects.
  const initialTypeId = initial
    ? awardTypes.find((t) => t.categories.some((c) => c.id === initial.categoryId))?.id ?? null
    : null;

  const [awardTypeId, setAwardTypeId] = useState<number | null>(initialTypeId);
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null);
  const [year, setYear] = useState<string>(initial ? String(initial.year) : "");
  const [result, setResult] = useState<string>(initial?.result ?? "winner");
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const [newTypeName, setNewTypeName] = useState("");
  const [newCatName, setNewCatName] = useState("");

  const selectedType = awardTypes.find((t) => t.id === awardTypeId) ?? null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!categoryId) throw new Error("Pick a category");
      const y = Number(year);
      if (!y || y < 1800 || y > 2100) throw new Error("Enter a valid year");
      await onSubmit({ categoryId, year: y, result, notes: notes.trim() || null });
    },
    onSuccess: () => {
      if (resetOnSubmit) {
        setAwardTypeId(null);
        setCategoryId(null);
        setYear("");
        setResult("winner");
        setNotes("");
      }
    },
  });

  const createTypeMutation = useMutation({
    mutationFn: (name: string) => admin.awards.createType({ name }),
    onSuccess: async (created) => {
      await qc.invalidateQueries({ queryKey: ["award-types"] });
      setAwardTypeId(created.id);
      setNewTypeName("");
    },
  });

  const createCatMutation = useMutation({
    mutationFn: ({ awardId, name }: { awardId: number; name: string }) =>
      admin.awards.createCategory(awardId, { name }),
    onSuccess: async (created) => {
      await qc.invalidateQueries({ queryKey: ["award-types"] });
      setCategoryId(created.id);
      setNewCatName("");
    },
  });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Award</label>
          <select
            value={awardTypeId ?? ""}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              setAwardTypeId(id);
              setCategoryId(null);
            }}
            className={inputCls}
          >
            <option value="">Select award…</option>
            {awardTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {isAdmin && (
            <div className="flex items-center gap-1 mt-1">
              <input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="+ new award name"
                className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <button
                type="button"
                onClick={() => newTypeName.trim() && createTypeMutation.mutate(newTypeName.trim())}
                disabled={!newTypeName.trim() || createTypeMutation.isPending}
                className="text-xs text-violet-600 hover:underline disabled:opacity-40 whitespace-nowrap"
              >
                Create
              </button>
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Category</label>
          <select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            disabled={!selectedType}
            className={inputCls + (!selectedType ? " opacity-50" : "")}
          >
            <option value="">{selectedType ? "Select category…" : "Pick an award first"}</option>
            {selectedType?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {isAdmin && selectedType && (
            <div className="flex items-center gap-1 mt-1">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="+ new category name"
                className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <button
                type="button"
                onClick={() =>
                  newCatName.trim() &&
                  createCatMutation.mutate({ awardId: selectedType.id, name: newCatName.trim() })
                }
                disabled={!newCatName.trim() || createCatMutation.isPending}
                className="text-xs text-violet-600 hover:underline disabled:opacity-40 whitespace-nowrap"
              >
                Create
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className={labelCls}>Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder={String(CURRENT_YEAR)}
            min={1800}
            max={2100}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Result</label>
          <select value={result} onChange={(e) => setResult(e.target.value)} className={inputCls}>
            {RESULTS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. joint award"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!categoryId || !year || mutation.isPending}
          className="text-sm bg-violet-700 text-white px-4 py-1.5 rounded-md hover:bg-violet-800 disabled:opacity-40 transition-colors"
        >
          {mutation.isPending ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-500 hover:underline"
          >
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
