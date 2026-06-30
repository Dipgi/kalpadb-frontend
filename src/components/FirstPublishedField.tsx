import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { search, works, type StoryDetail } from "../lib/api";
import { issueDisplay } from "../lib/issues";
import EntityPicker, { type PickerItem } from "./EntityPicker";

export type FirstPublishedMode = "none" | "book" | "issue" | "note";

export interface FirstPublishedValue {
  mode: FirstPublishedMode;
  book: PickerItem | null;
  issue: { m_issue_id: number; label: string } | null;
  note: string;
  /** "YYYY" or "YYYY-MM-DD". */
  date: string;
}

export const emptyFirstPublished: FirstPublishedValue = {
  mode: "none",
  book: null,
  issue: null,
  note: "",
  date: "",
};

/** Seed the field from a story-detail response. */
export function firstPublishedFromDetail(
  fp: StoryDetail["first_published"]
): FirstPublishedValue {
  if (!fp) return emptyFirstPublished;
  const date = fp.pub_date ?? "";
  if (fp.book_id != null) {
    return { mode: "book", book: { id: fp.book_id, name: fp.title ?? `Book #${fp.book_id}` }, issue: null, note: "", date };
  }
  if (fp.issue_id != null) {
    return {
      mode: "issue",
      book: null,
      issue: { m_issue_id: fp.issue_id, label: fp.title ?? `Issue #${fp.issue_id}` },
      note: "",
      date,
    };
  }
  if (fp.note) return { mode: "note", book: null, issue: null, note: fp.note, date };
  return { ...emptyFirstPublished, date };
}

/** Derive the four story-payload fields from the field value. */
export function firstPublishedPayload(v: FirstPublishedValue) {
  const date = v.date ? (v.date.length === 4 ? `${v.date}-01-01` : v.date) : null;
  return {
    first_published_book_id: v.mode === "book" ? (v.book?.id ?? null) : null,
    first_published_issue_id: v.mode === "issue" ? (v.issue?.m_issue_id ?? null) : null,
    first_published_note: v.mode === "note" ? (v.note.trim() || null) : null,
    first_published_date: date,
  };
}

const MODES: { key: FirstPublishedMode; label: string }[] = [
  { key: "none", label: "Unknown" },
  { key: "book", label: "Catalogued book" },
  { key: "issue", label: "Magazine issue" },
  { key: "note", label: "Other (free text)" },
];

/**
 * "First published in" — the original publication venue of a story. Exactly one
 * venue at a time: a catalogued book, a catalogued magazine issue, or free text.
 */
export default function FirstPublishedField({
  value,
  onChange,
}: {
  value: FirstPublishedValue;
  onChange: (v: FirstPublishedValue) => void;
}) {
  const [mag, setMag] = useState<PickerItem[]>([]);
  const magId = mag[0]?.id;
  const [sel, setSel] = useState("");

  const { data: issues } = useQuery({
    queryKey: ["magazine-issues", magId],
    queryFn: () => works.magazineIssues(magId!),
    enabled: !!magId,
  });

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        First published in — optional
      </label>

      <div className="flex flex-wrap gap-2 mb-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange({ ...value, mode: m.key })}
            className={`text-xs px-3 py-1 rounded-full border ${
              value.mode === m.key
                ? "bg-violet-700 text-white border-violet-700"
                : "bg-white text-gray-600 border-gray-200 hover:border-violet-400"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {value.mode === "book" && (
        <EntityPicker
          label=""
          placeholder="Search a book…"
          fetchKey="picker-first-pub-book"
          fetcher={(q) =>
            search.query(q).then((r) => ({
              items: r.works
                .filter((w) => w.type === "BOOK")
                .map((w) => ({ id: w.id, name: w.title })),
            }))
          }
          selected={value.book ? [value.book] : []}
          onChange={(items) => onChange({ ...value, book: items.slice(-1)[0] ?? null })}
        />
      )}

      {value.mode === "issue" && (
        <div>
          {value.issue && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full">
                {value.issue.label}
                <button
                  type="button"
                  onClick={() => onChange({ ...value, issue: null })}
                  className="hover:text-violet-900"
                >
                  ×
                </button>
              </span>
            </div>
          )}
          <EntityPicker
            label=""
            placeholder="Search a magazine…"
            fetchKey="picker-first-pub-magazine"
            fetcher={(q) =>
              search.query(q).then((r) => ({
                items: r.works
                  .filter((w) => w.type === "MAGAZINE")
                  .map((w) => ({ id: w.id, name: w.title })),
              }))
            }
            selected={mag}
            onChange={(items) => {
              setMag(items.slice(-1));
              setSel("");
            }}
          />
          {magId && (
            <div className="flex gap-2 mt-2">
              <select
                value={sel}
                onChange={(e) => setSel(e.target.value)}
                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select an issue…</option>
                {(issues ?? []).map((i) => (
                  <option key={i.m_issue_id} value={i.m_issue_id}>
                    {issueDisplay(i) ?? `Issue #${i.m_issue_id}`}
                    {i.publication_date ? ` (${i.publication_date.slice(0, 4)})` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const iss = issues?.find((i) => i.m_issue_id === Number(sel));
                  if (!iss) return;
                  onChange({
                    ...value,
                    issue: {
                      m_issue_id: iss.m_issue_id,
                      label: `${mag[0].name} — ${issueDisplay(iss) ?? `#${iss.m_issue_id}`}`,
                    },
                  });
                  setSel("");
                }}
                disabled={!sel}
                className="text-xs px-3 py-2 rounded-md bg-violet-700 text-white disabled:opacity-40 hover:bg-violet-800"
              >
                Set
              </button>
            </div>
          )}
        </div>
      )}

      {value.mode === "note" && (
        <input
          type="text"
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
          placeholder="e.g. Desh magazine, 1962"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      )}

      {value.mode !== "none" && (
        <input
          type="text"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          placeholder="First-published date (YYYY or YYYY-MM-DD) — optional"
          className="mt-2 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      )}
    </div>
  );
}
