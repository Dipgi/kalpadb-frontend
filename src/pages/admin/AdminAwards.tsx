import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogue, admin, ApiError, type AwardTypeItem, type AwardCategoryItem } from "../../lib/api";
import { COUNTRIES } from "../../lib/countries";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

/** Country dropdown that stores the full English name (matches existing award data
 * and what the public Awards page displays). Keeps a legacy value selectable. */
function CountryNameSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const known = COUNTRIES.some((c) => c.name === value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">— none —</option>
      {value && !known && <option value={value}>{value}</option>}
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.name}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

/** Language dropdown storing a BCP-47 code (matches award_types.language, e.g. "bn"). */
function LanguageSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: languages } = useQuery({ queryKey: ["all-languages"], queryFn: catalogue.allLanguages });
  const known = (languages ?? []).some((l) => l.code === value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">— none —</option>
      {value && !known && <option value={value}>{value}</option>}
      {(languages ?? []).map((l) => (
        <option key={l.code} value={l.code}>
          {l.name}
          {l.name_local && l.name_local !== l.name ? ` (${l.name_local})` : ""}
        </option>
      ))}
    </select>
  );
}

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
  const [awardingBody, setAwardingBody] = useState("");
  const [inauguralYear, setInauguralYear] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [catInput, setCatInput] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["award-types"] });

  function addCategory() {
    const c = catInput.trim();
    if (c && !categories.some((x) => x.toLowerCase() === c.toLowerCase())) {
      setCategories((prev) => [...prev, c]);
    }
    setCatInput("");
  }

  const createMutation = useMutation({
    mutationFn: async (cats: string[]) => {
      const award = await admin.awards.createType({
        name: name.trim(),
        country: country.trim() || null,
        language: language.trim() || null,
        awarding_body: awardingBody.trim() || null,
        inaugural_year: inauguralYear.trim() ? Number(inauguralYear) : null,
        website: website.trim() || null,
        notes: notes.trim() || null,
      });
      // Create each named category under the new award.
      for (const c of cats) {
        await admin.awards.createCategory(award.id, { name: c });
      }
      return award;
    },
    onSuccess: () => {
      setName("");
      setCountry("");
      setLanguage("");
      setAwardingBody("");
      setInauguralYear("");
      setWebsite("");
      setNotes("");
      setCategories([]);
      setCatInput("");
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
    // Fold a half-typed category into the list before submitting.
    const pending = catInput.trim();
    const finalCats =
      pending && !categories.some((x) => x.toLowerCase() === pending.toLowerCase())
        ? [...categories, pending]
        : categories;
    createMutation.mutate(finalCats);
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
            <CountryNameSelect value={country} onChange={setCountry} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Language (optional)</label>
            <LanguageSelect value={language} onChange={setLanguage} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Awarding body (optional)</label>
            <input
              value={awardingBody}
              onChange={(e) => setAwardingBody(e.target.value)}
              placeholder="e.g. Kalpabiswa, Sahitya Akademi"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">First awarded (optional)</label>
            <input
              type="number"
              value={inauguralYear}
              onChange={(e) => setInauguralYear(e.target.value)}
              placeholder="2016"
              min={1800}
              max={2100}
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">Website (optional)</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scope, frequency…" className={inputCls} />
        </div>

        {/* Categories — an award needs at least one (e.g. Best Novel). Add them here,
            or later on the award's card below. */}
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">
            Categories <span className="text-gray-400">(e.g. Best Novel, Best Short Story)</span>
          </label>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {categories.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => setCategories((prev) => prev.filter((x) => x !== c))}
                    className="hover:text-teal-950 font-bold"
                    aria-label={`Remove ${c}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={catInput}
              onChange={(e) => setCatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCategory();
                }
              }}
              placeholder="Type a category and press Enter"
              className={inputCls}
            />
            <button
              type="button"
              onClick={addCategory}
              disabled={!catInput.trim()}
              className="text-sm px-3 py-2 rounded-md border border-teal-300 text-teal-700 hover:bg-teal-50 disabled:opacity-40 whitespace-nowrap"
            >
              Add
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Single-category prize? Add one named e.g. “Award”. You can also add categories later on
            the award’s card.
          </p>
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
  const [awardingBody, setAwardingBody] = useState(award.awarding_body ?? "");
  const [inauguralYear, setInauguralYear] = useState(
    award.inaugural_year != null ? String(award.inaugural_year) : ""
  );
  const [discontinuedYear, setDiscontinuedYear] = useState(
    award.discontinued_year != null ? String(award.discontinued_year) : ""
  );
  const [website, setWebsite] = useState(award.website ?? "");
  const [active, setActive] = useState(award.is_active);
  const [newCat, setNewCat] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      admin.awards.updateType(award.id, {
        name: name.trim(),
        country: country.trim() || null,
        language: language.trim() || null,
        awarding_body: awardingBody.trim() || null,
        inaugural_year: inauguralYear.trim() ? Number(inauguralYear) : null,
        discontinued_year: discontinuedYear.trim() ? Number(discontinuedYear) : null,
        website: website.trim() || null,
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
          <CountryNameSelect value={country} onChange={setCountry} />
          <LanguageSelect value={language} onChange={setLanguage} />
          <input
            value={awardingBody}
            onChange={(e) => setAwardingBody(e.target.value)}
            placeholder="Awarding body"
            className={inputCls + " sm:col-span-2"}
          />
          <input
            type="number"
            value={inauguralYear}
            onChange={(e) => setInauguralYear(e.target.value)}
            placeholder="First yr"
            min={1800}
            max={2100}
            className={inputCls}
          />
          <input
            type="number"
            value={discontinuedYear}
            onChange={(e) => setDiscontinuedYear(e.target.value)}
            placeholder="Last yr"
            min={1800}
            max={2100}
            className={inputCls}
          />
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="Website URL"
            className={inputCls + " sm:col-span-4"}
          />
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
          {award.awarding_body && (
            <span className="text-xs text-gray-500">· {award.awarding_body}</span>
          )}
          {(award.inaugural_year || award.discontinued_year) && (
            <span className="text-xs text-gray-400">
              · {award.inaugural_year ?? "?"}
              {award.discontinued_year ? `–${award.discontinued_year}` : ""}
            </span>
          )}
          {award.country && <span className="text-xs text-gray-400">· {award.country}</span>}
          {award.language && <span className="text-xs text-gray-400 uppercase">· {award.language}</span>}
          {award.website && (
            <a
              href={award.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-600 hover:underline"
            >
              site ↗
            </a>
          )}
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
