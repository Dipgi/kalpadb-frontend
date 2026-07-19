import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ApiError, profiles } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useSeo } from "../hooks/useSeo";
import Avatar from "../components/Avatar";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

export default function AccountPage() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  useSeo({ title: "Edit profile" });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user && !initialised) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setBio(user.bio ?? "");
      setImageUrl(user.image_url ?? null);
      setInitialised(true);
    }
  }, [user, initialised]);

  const save = useMutation({
    mutationFn: () =>
      profiles.updateMe({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        bio: bio.trim() || null,
        image_url: imageUrl,
      }),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
      setError(null);
    },
    onError: (e) => {
      setSaved(false);
      setError(e instanceof ApiError ? e.message : "Save failed — try again.");
    },
  });

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await profiles.uploadAvatar(file);
      setImageUrl(url);
      setSaved(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed — try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (loading || !user) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-gray-400 text-center">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Edit profile</h1>
        <Link
          to={`/users/${encodeURIComponent(user.username)}`}
          className="text-sm text-violet-700 hover:text-violet-900 font-medium"
        >
          View public profile
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-5"
      >
        {/* Picture */}
        <div className="flex items-center gap-4">
          <Avatar url={imageUrl} name={user.username} sizeCls="w-20 h-20 text-2xl" />
          <div className="space-y-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-sm text-violet-700 hover:text-violet-900 font-medium disabled:opacity-50"
              >
                {uploading ? "Uploading…" : imageUrl ? "Change picture" : "Upload picture"}
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl(null);
                    setSaved(false);
                  }}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400">JPG/PNG up to 10 MB — stored as WebP.</p>
          </div>
        </div>

        {/* Identity (read-only) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Username</label>
            <input value={user.username} disabled className={inputCls + " bg-gray-50 text-gray-500"} />
          </div>
          <div>
            <label className={labelCls}>Email (private — never shown publicly)</label>
            <input value={user.email} disabled className={inputCls + " bg-gray-50 text-gray-500"} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>First name</label>
            <input
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setSaved(false);
              }}
              maxLength={100}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Last name</label>
            <input
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setSaved(false);
              }}
              maxLength={100}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              setSaved(false);
            }}
            rows={4}
            maxLength={2000}
            placeholder="A few lines about you — interests, favourite authors, what you contribute…"
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            Shown on your public profile. {2000 - bio.length} characters left.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={save.isPending || uploading}
            className="bg-violet-700 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-violet-800 disabled:opacity-50 transition-colors"
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved.</span>}
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </form>
    </div>
  );
}
