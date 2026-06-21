import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, catalogue, volunteer, ApiError, type Person } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import ImageUploadField from "../../components/ImageUploadField";
import ContributorGate from "../../components/ContributorGate";
import EditNoteField from "../../components/EditNoteField";
import EditSavedBanner from "../../components/EditSavedBanner";
import PrimaryLanguageSelect from "../../components/PrimaryLanguageSelect";
import NativeNameField from "../../components/NativeNameField";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

const ROLE_TYPES = ["author", "illustrator", "editor", "translator"];

export default function AdminEditPerson() {
  const { id } = useParams<{ id: string }>();
  const { data: person, isLoading } = useQuery({
    queryKey: ["person", id],
    queryFn: () => catalogue.person(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-gray-400 py-12 text-center">Loading person…</div>;
  if (!person) return <div className="text-gray-400 py-12 text-center">Person not found.</div>;
  return (
    <ContributorGate>
      <EditForm key={person.id} person={person} />
    </ContributorGate>
  );
}

function EditForm({ person }: { person: Person }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";

  const [name, setName] = useState(person.name);
  const [roleType, setRoleType] = useState(person.role_type ?? "author");
  const [nationality, setNationality] = useState(person.nationality ?? "");
  const [primaryLanguage, setPrimaryLanguage] = useState(person.primary_language ?? "");
  const [nativeName, setNativeName] = useState(
    person.primary_language ? (person.localised?.name?.[person.primary_language] ?? "") : "",
  );
  const [birthDate, setBirthDate] = useState(person.birth_date ?? "");
  const [deathDate, setDeathDate] = useState(person.end_date ?? "");
  const [bio, setBio] = useState(person.bio ?? "");
  const [imageUrl, setImageUrl] = useState(person.image_url ?? "");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const localised =
        primaryLanguage && nativeName.trim()
          ? { name: { [primaryLanguage]: nativeName.trim() } }
          : undefined;
      const sub = await volunteer.updatePerson(
        person.id,
        {
          name: name.trim(),
          bio: bio.trim() || null,
          nationality: nationality.trim() || null,
          role_type: roleType.trim() || null,
          primary_language: primaryLanguage || null,
          birth_date: birthDate || null,
          end_date: deathDate || null,
          image_url: imageUrl.trim() || null,
          localised,
        },
        isAdmin ? undefined : note,
      );
      // Admins write live by auto-approving their own submission; volunteers queue it.
      if (isAdmin) await admin.queue.review(sub.edit_id, true, "Direct admin edit");
      return sub;
    },
    onSuccess: () => {
      setSaved(true);
      if (isAdmin) {
        qc.invalidateQueries({ queryKey: ["person", String(person.id)] });
        qc.invalidateQueries({ queryKey: ["persons-list"] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => admin.persons.delete(person.id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["person", String(person.id)] });
      navigate("/admin/catalogue");
    },
  });

  const deleteErr =
    deleteMutation.error instanceof ApiError && deleteMutation.error.status === 409
      ? "Still credited on works — remove those credits first."
      : deleteMutation.isError
        ? "Delete failed."
        : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        if (name.trim()) mutation.mutate();
      }}
      className="max-w-2xl space-y-4"
    >
      <h1 className="text-xl font-bold text-gray-900">
        Edit Person
        <span className="ml-2 text-sm font-normal text-gray-400">#{person.id}</span>
      </h1>

      {saved && (
        <EditSavedBanner
          isAdmin={!!isAdmin}
          viewHref={`/persons/${person.id}`}
          viewLabel="View person"
        />
      )}

      <div>
        <label className={labelCls}>Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Primary role (hint)</label>
          <select value={roleType} onChange={(e) => setRoleType(e.target.value)} className={inputCls}>
            {ROLE_TYPES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
            {person.role_type && !ROLE_TYPES.includes(person.role_type) && (
              <option value={person.role_type}>{person.role_type}</option>
            )}
          </select>
        </div>
        <div>
          <label className={labelCls}>Nationality</label>
          <input value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Birth date</label>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Death date</label>
          <input type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      <PrimaryLanguageSelect value={primaryLanguage} onChange={setPrimaryLanguage} />

      <NativeNameField
        primaryLanguage={primaryLanguage}
        value={nativeName}
        onChange={setNativeName}
      />

      <div>
        <label className={labelCls}>Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={inputCls} />
      </div>

      <ImageUploadField
        label="Image"
        category="people"
        value={imageUrl}
        onChange={(url) => setImageUrl(url ?? "")}
      />

      <p className="text-xs text-gray-400">
        Leaving a field blank keeps its current value (it won't clear it).
      </p>

      <EditNoteField show={!isAdmin} value={note} onChange={setNote} />

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-violet-700 text-white text-sm px-5 py-2 rounded-md font-medium hover:bg-violet-800 disabled:opacity-40 transition-colors"
        >
          {mutation.isPending
            ? isAdmin
              ? "Saving…"
              : "Submitting…"
            : isAdmin
              ? "Save changes"
              : "Submit for review"}
        </button>
        <Link to={`/persons/${person.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </Link>
        {mutation.isError && <span className="text-sm text-red-500">Save failed — try again.</span>}

        {isAdmin && (
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirmDelete) deleteMutation.mutate();
              else setConfirmDelete(true);
            }}
            onBlur={() => setConfirmDelete(false)}
            className={`ml-auto text-sm px-4 py-2 rounded-md border transition-colors disabled:opacity-40 ${
              confirmDelete
                ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                : "border-red-300 text-red-600 hover:bg-red-50"
            }`}
          >
            {deleteMutation.isPending
              ? "Deleting…"
              : confirmDelete
                ? "Click again to permanently delete"
                : "Delete person"}
          </button>
        )}
      </div>
      {isAdmin && deleteErr && <p className="text-sm text-red-500 text-right">{deleteErr}</p>}
    </form>
  );
}
