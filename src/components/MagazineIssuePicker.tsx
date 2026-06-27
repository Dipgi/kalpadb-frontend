import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { search, works } from "../lib/api";
import EntityPicker, { type PickerItem } from "./EntityPicker";

export interface IssueRef {
  m_issue_id: number;
  label: string;
}

/**
 * Attach a work (story) to one or more magazine issues. Search a magazine, then
 * pick one of its issues; selected issues show as removable chips.
 */
export default function MagazineIssuePicker({
  value,
  onChange,
}: {
  value: IssueRef[];
  onChange: (v: IssueRef[]) => void;
}) {
  const [mag, setMag] = useState<PickerItem[]>([]);
  const magId = mag[0]?.id;
  const [sel, setSel] = useState("");

  const { data: issues } = useQuery({
    queryKey: ["magazine-issues", magId],
    queryFn: () => works.magazineIssues(magId!),
    enabled: !!magId,
  });

  function add() {
    const iss = issues?.find((i) => i.m_issue_id === Number(sel));
    if (!iss || value.some((v) => v.m_issue_id === iss.m_issue_id)) return;
    onChange([
      ...value,
      {
        m_issue_id: iss.m_issue_id,
        label: `${mag[0].name} — ${iss.issue_number ?? `#${iss.m_issue_id}`}`,
      },
    ]);
    setSel("");
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        Appears in magazine issue(s) — optional
      </label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((v) => (
            <span
              key={v.m_issue_id}
              className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full"
            >
              {v.label}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.m_issue_id !== v.m_issue_id))}
                className="hover:text-violet-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <EntityPicker
        label=""
        placeholder="Search a magazine…"
        fetchKey="picker-magazines"
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
                {i.issue_number ?? `Issue #${i.m_issue_id}`}
                {i.publication_date ? ` (${i.publication_date.slice(0, 4)})` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={!sel}
            className="text-xs px-3 py-2 rounded-md bg-violet-700 text-white disabled:opacity-40 hover:bg-violet-800"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
