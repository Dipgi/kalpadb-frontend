import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, catalogue, volunteer, ApiError, type PublisherDetail } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import ImageUploadField from "../../components/ImageUploadField";
import CountrySelect from "../../components/CountrySelect";
import ContributorGate from "../../components/ContributorGate";
import EditNoteField from "../../components/EditNoteField";
import EditSavedBanner from "../../components/EditSavedBanner";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

export default function AdminEditPublisher() {
  const { id } = useParams<{ id: string }>();
  const { data: publisher, isLoading } = useQuery({
    queryKey: ["publisher", id],
    queryFn: () => catalogue.publisher(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-gray-400 py-12 text-center">Loading publisher…</div>;
  if (!publisher) return <div className="text-gray-400 py-12 text-center">Publisher not found.</div>;
  return (
    <ContributorGate>
      <EditForm key={publisher.id} publisher={publisher} />
    </ContributorGate>
  );
}

function EditForm({ publisher }: { publisher: PublisherDetail }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";

  const [name, setName] = useState(publisher.name);
  const [city, setCity] = useState(publisher.city ?? "");
  const [country, setCountry] = useState(publisher.country ?? "");
  const [foundedYear, setFoundedYear] = useState(publisher.founded_year?.toString() ?? "");
  const [defunctYear, setDefunctYear] = useState(publisher.defunct_year?.toString() ?? "");
  const [website, setWebsite] = useState(publisher.website ?? "");
  const [description, setDescription] = useState(publisher.description ?? "");
  const [imageUrl, setImageUrl] = useState(publisher.image_url ?? "");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const sub = await volunteer.updatePublisher(
        publisher.id,
        {
          name: name.trim(),
          city: city.trim() || null,
          country: country.trim() || null,
          founded_year: foundedYear ? Number(foundedYear) : null,
          defunct_year: defunctYear ? Number(defunctYear) : null,
          website: website.trim() || null,
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
        },
        isAdmin ? undefined : note,
      );
      if (isAdmin) await admin.queue.review(sub.edit_id, true, "Direct admin edit");
      return sub;
    },
    onSuccess: () => {
      setSaved(true);
      if (isAdmin) {
        qc.invalidateQueries({ queryKey: ["publisher", String(publisher.id)] });
        qc.invalidateQueries({ queryKey: ["publishers-list"] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => admin.publishers.delete(publisher.id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["publisher", String(publisher.id)] });
      navigate("/admin/catalogue");
    },
  });

  const deleteErr =
    deleteMutation.error instanceof ApiError && deleteMutation.error.status === 409
      ? "Still linked to books — unlink it first."
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
        Edit Publisher
        <span className="ml-2 text-sm font-normal text-gray-400">#{publisher.id}</span>
      </h1>

      {saved && (
        <EditSavedBanner
          isAdmin={!!isAdmin}
          viewHref={`/publishers/${publisher.id}`}
          viewLabel="View publisher"
        />
      )}

      <div>
        <label className={labelCls}>Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Country</label>
          <CountrySelect value={country} onChange={setCountry} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Founded year</label>
          <input
            type="number"
            min={1000}
            max={2100}
            value={foundedYear}
            onChange={(e) => setFoundedYear(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Defunct year</label>
          <input
            type="number"
            min={1000}
            max={2100}
            value={defunctYear}
            onChange={(e) => setDefunctYear(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Website</label>
        <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
      </div>

      <ImageUploadField
        label="Image / logo"
        category="publishers"
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
        <Link
          to={isAdmin ? "/admin/catalogue" : `/publishers/${publisher.id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
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
                : "Delete publisher"}
          </button>
        )}
      </div>
      {isAdmin && deleteErr && <p className="text-sm text-red-500 text-right">{deleteErr}</p>}
    </form>
  );
}
