import { Link } from "react-router-dom";
import type { DuplicateCandidate } from "../lib/api";

/**
 * Shown after a create is rejected (409) because a person/publisher with a similar
 * name already exists. Lists the existing candidate(s) so the editor can reuse one,
 * and offers a "Create anyway" escape hatch.
 */
export default function DuplicateMatchPrompt({
  kind,
  candidates,
  onCreateAnyway,
  onDismiss,
  busy,
}: {
  kind: "person" | "publisher";
  candidates: DuplicateCandidate[];
  onCreateAnyway: () => void;
  onDismiss?: () => void;
  busy?: boolean;
}) {
  const base = kind === "person" ? "/persons" : "/publishers";
  return (
    <div className="bg-amber-50 border border-amber-300 text-amber-900 text-sm rounded-md px-4 py-3 mb-4 space-y-3">
      <p className="font-medium">
        A {kind} with a similar name already exists. Is it one of these?
      </p>
      <ul className="divide-y divide-amber-200 rounded-md border border-amber-200 bg-white">
        {candidates.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-3 py-2">
            <Link
              to={`${base}/${c.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-700 hover:underline font-medium"
            >
              {c.name} <span className="text-xs text-gray-400">#{c.id}</span>
            </Link>
            <span className="text-xs text-gray-400">
              {Math.round(c.similarity * 100)}% match
              {c.localised_match ? " · localised" : ""}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCreateAnyway}
          disabled={busy}
          className="bg-amber-600 text-white text-xs px-3 py-1.5 rounded-md font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? "Creating…" : "None of these — create new"}
        </button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            className="text-xs text-amber-800 hover:underline disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
