import { useRef, useState } from "react";
import { uploads, ApiError, type ImageCategory } from "../lib/api";

interface Props {
  /** Current image URL (or null/empty when none). */
  value: string | null | undefined;
  /** Called with the new public URL after upload/re-host, or null when cleared. */
  onChange: (url: string | null) => void;
  /** Storage category / bucket folder. */
  category: ImageCategory;
  label?: string;
}

/**
 * Upload an image (file or external URL) to R2 and report back the public URL.
 * Both paths go through the backend, which downsizes + converts to WebP.
 */
export default function ImageUploadField({ value, onChange, category, label = "Image" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");

  async function run(fn: () => Promise<{ url: string }>) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await fn();
      onChange(url);
      setUrlInput("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-gray-600">{label}</span>

      {value ? (
        <div className="flex items-start gap-3">
          <img
            src={value}
            alt=""
            className="h-24 w-auto rounded border border-gray-200 object-cover bg-gray-50"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={busy}
            className="text-xs px-2 py-1 rounded border border-gray-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400">No image yet.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="text-xs px-2.5 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload file"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) run(() => uploads.image(f, category));
          }}
        />
        <span className="text-xs text-gray-400">or</span>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="paste image URL"
          disabled={busy}
          className="flex-1 min-w-[160px] border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => urlInput.trim() && run(() => uploads.fromUrl(urlInput.trim(), category))}
          disabled={busy || !urlInput.trim()}
          className="text-xs px-2.5 py-1.5 rounded bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50"
        >
          Re-host
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
