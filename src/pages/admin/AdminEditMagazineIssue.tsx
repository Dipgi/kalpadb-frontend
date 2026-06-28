import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  admin,
  catalogue,
  search,
  volunteer,
  works,
  type MagazineIssueFull,
  type ScanInput,
} from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import EntityPicker, { type PickerItem } from "../../components/EntityPicker";
import ImageUploadField from "../../components/ImageUploadField";
import ContributorGate from "../../components/ContributorGate";
import EditNoteField from "../../components/EditNoteField";

const inputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

const SCAN_TYPES = ["full_issue", "partial", "text_only", "cover_only"] as const;
const LEGAL_STATUSES = ["open_access", "public_domain", "permission", "unknown"] as const;

async function createPersonInline(
  name: string,
  opts?: { allowDuplicate?: boolean },
): Promise<PickerItem> {
  const sub = await volunteer.submitPerson({ name }, opts?.allowDuplicate);
  const entry = await admin.queue.review(sub.edit_id, true, "Direct admin entry");
  return { id: entry.record_id!, name };
}

async function createPublisherInline(
  name: string,
  opts?: { allowDuplicate?: boolean },
): Promise<PickerItem> {
  const sub = await volunteer.submitPublisher({ name }, opts?.allowDuplicate);
  const entry = await admin.queue.review(sub.edit_id, true, "Direct admin entry");
  return { id: entry.record_id!, name };
}

export default function AdminEditMagazineIssue() {
  const { magId, issueId } = useParams<{ magId: string; issueId?: string }>();
  const magazineId = Number(magId);

  const { data: magazine, isLoading: magLoading } = useQuery({
    queryKey: ["work", magId],
    queryFn: () => works.get(magazineId),
    enabled: !!magId,
  });

  // In edit mode, load the full issue (with credits + scans) from the magazine's issue list.
  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ["magazine-issues", magazineId],
    queryFn: () => works.magazineIssues(magazineId),
    enabled: !!magId,
  });

  if (magLoading || (issueId && issuesLoading)) {
    return <div className="text-gray-400 py-12 text-center">Loading…</div>;
  }
  if (!magazine || magazine.type !== "MAGAZINE") {
    return <div className="text-gray-400 py-12 text-center">Magazine not found.</div>;
  }
  const existing = issueId
    ? issues?.find((i) => i.m_issue_id === Number(issueId)) ?? null
    : null;
  if (issueId && !existing) {
    return <div className="text-gray-400 py-12 text-center">Issue not found.</div>;
  }

  return (
    <ContributorGate>
      <IssueForm
        key={existing?.m_issue_id ?? "new"}
        magazineId={magazineId}
        magazineTitle={magazine.title}
        existing={existing}
      />
    </ContributorGate>
  );
}

function IssueForm({
  magazineId,
  magazineTitle,
  existing,
}: {
  magazineId: number;
  magazineTitle: string;
  existing: MagazineIssueFull | null;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role.toLowerCase() === "admin";
  const navigate = useNavigate();
  const [note, setNote] = useState("");

  const [issueNumber, setIssueNumber] = useState(existing?.issue_number ?? "");
  const [pubDate, setPubDate] = useState(existing?.publication_date ?? "");
  const [coverUrl, setCoverUrl] = useState(existing?.cover_image_url ?? "");
  const [synopsis, setSynopsis] = useState(existing?.synopsis ?? "");
  const toItems = (xs: { id: number; name: string }[]) => xs.map((x) => ({ id: x.id, name: x.name }));
  const [editors, setEditors] = useState<PickerItem[]>(toItems(existing?.editors ?? []));
  const [coverArtists, setCoverArtists] = useState<PickerItem[]>(toItems(existing?.cover_artists ?? []));
  const [illustrators, setIllustrators] = useState<PickerItem[]>(toItems(existing?.illustrators ?? []));
  const [translators, setTranslators] = useState<PickerItem[]>(toItems(existing?.translators ?? []));
  const [publishers, setPublishers] = useState<PickerItem[]>(toItems(existing?.publishers ?? []));
  const [stories, setStories] = useState<PickerItem[]>(
    (existing?.stories ?? []).map((s) => ({ id: s.story_id, name: s.title }))
  );
  // Preserve existing page ranges (the UI doesn't edit them yet) so re-saving
  // doesn't wipe page numbers entered elsewhere.
  const pageRanges = new Map(
    (existing?.stories ?? []).map((s) => [s.story_id, { page_start: s.page_start, page_end: s.page_end }])
  );
  const [scans, setScans] = useState<ScanInput[]>(
    (existing?.scans ?? []).map((s) => ({
      url: s.url,
      archive_host: s.archive_host,
      scan_type: (s.scan_type as ScanInput["scan_type"]) ?? null,
      legal_status: (s.legal_status as ScanInput["legal_status"]) ?? null,
      quality_note: s.quality_note,
    }))
  );
  const [saved, setSaved] = useState(false);

  function setScan(idx: number, patch: Partial<ScanInput>) {
    setScans((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const cleanScans = scans
        .filter((s) => s.url.trim())
        .map((s) => ({
          url: s.url.trim(),
          archive_host: s.archive_host?.trim() || null,
          scan_type: s.scan_type || null,
          legal_status: s.legal_status || null,
          quality_note: s.quality_note?.trim() || null,
        }));
      const payload = {
        issue_number: issueNumber.trim() || null,
        publication_date: pubDate || null,
        cover_image_url: coverUrl.trim() || null,
        synopsis: synopsis.trim() || null,
        editor_ids: editors.map((e) => e.id),
        cover_artist_ids: coverArtists.map((c) => c.id),
        illustrator_ids: illustrators.map((i) => i.id),
        translator_ids: translators.map((t) => t.id),
        publisher_ids: publishers.map((p) => p.id),
        scans: cleanScans,
        stories: stories.map((s) => ({
          story_id: s.id,
          page_start: pageRanges.get(s.id)?.page_start ?? null,
          page_end: pageRanges.get(s.id)?.page_end ?? null,
        })),
      };
      const sub = existing
        ? await volunteer.updateMagazineIssue(existing.m_issue_id, payload, isAdmin ? undefined : note)
        : await volunteer.submitMagazineIssue({ magazine_id: magazineId, ...payload });
      if (isAdmin) await admin.queue.review(sub.edit_id, true, "Direct admin edit");
      return sub;
    },
    onSuccess: () => {
      setSaved(true);
      if (isAdmin) {
        qc.invalidateQueries({ queryKey: ["magazine-issues", magazineId] });
        qc.invalidateQueries({ queryKey: ["work", String(magazineId)] });
        navigate(`/admin/edit-magazine/${magazineId}`);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        mutation.mutate();
      }}
      className="max-w-2xl space-y-4"
    >
      <h1 className="text-xl font-bold text-gray-900">
        {existing ? "Edit Issue" : "Add Issue"}
        <span className="ml-2 text-sm font-normal text-gray-400">{magazineTitle}</span>
      </h1>

      {saved && !isAdmin && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3">
          Submitted for review.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Issue number / label</label>
          <input
            value={issueNumber}
            onChange={(e) => setIssueNumber(e.target.value)}
            placeholder="e.g. Vol.3 No.7, Puja 1978"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Cover date</label>
          <input type="date" value={pubDate} onChange={(e) => setPubDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Synopsis / contents note</label>
        <textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} rows={3} className={inputCls} />
      </div>

      <ImageUploadField
        label="Cover image"
        category="covers"
        value={coverUrl}
        onChange={(url) => setCoverUrl(url ?? "")}
      />

      <EntityPicker
        label="Editors"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={editors}
        onChange={setEditors}
        onCreate={isAdmin ? createPersonInline : undefined}
      />
      <EntityPicker
        label="Cover artists"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={coverArtists}
        onChange={setCoverArtists}
        onCreate={isAdmin ? createPersonInline : undefined}
      />
      <EntityPicker
        label="Illustrators"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={illustrators}
        onChange={setIllustrators}
        onCreate={isAdmin ? createPersonInline : undefined}
      />
      <EntityPicker
        label="Translators"
        placeholder="Search or create a person…"
        fetchKey="picker-persons"
        fetcher={(q) => catalogue.persons(q)}
        selected={translators}
        onChange={setTranslators}
        onCreate={isAdmin ? createPersonInline : undefined}
      />
      <EntityPicker
        label="Publishers"
        placeholder="Search or create a publisher…"
        fetchKey="picker-publishers"
        fetcher={(q) => catalogue.publishers(q)}
        selected={publishers}
        onChange={setPublishers}
        onCreate={isAdmin ? createPublisherInline : undefined}
      />

      <EntityPicker
        label="Stories in this issue"
        placeholder="Search existing stories…"
        fetchKey="picker-issue-stories"
        fetcher={(q) =>
          search.query(q).then((r) => ({
            items: r.works
              .filter((w) => w.type === "STORY")
              .map((w) => ({ id: w.id, name: w.title })),
          }))
        }
        selected={stories}
        onChange={setStories}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls + " mb-0"}>Scan / archive links</label>
          <button
            type="button"
            onClick={() => setScans((prev) => [...prev, { url: "" }])}
            className="text-xs text-violet-600 hover:underline"
          >
            + Add scan
          </button>
        </div>
        {scans.length === 0 ? (
          <p className="text-xs text-gray-400">No scans linked.</p>
        ) : (
          <div className="space-y-3">
            {scans.map((s, idx) => (
              <div key={idx} className="border border-gray-200 rounded-md p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={s.url}
                    onChange={(e) => setScan(idx, { url: e.target.value })}
                    placeholder="https://archive.org/…"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setScans((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-red-500 hover:text-red-700 shrink-0"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    value={s.archive_host ?? ""}
                    onChange={(e) => setScan(idx, { archive_host: e.target.value })}
                    placeholder="host (archive.org)"
                    className={inputCls}
                  />
                  <select
                    value={s.scan_type ?? ""}
                    onChange={(e) => setScan(idx, { scan_type: (e.target.value || null) as ScanInput["scan_type"] })}
                    className={inputCls}
                  >
                    <option value="">type…</option>
                    {SCAN_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                  <select
                    value={s.legal_status ?? ""}
                    onChange={(e) => setScan(idx, { legal_status: (e.target.value || null) as ScanInput["legal_status"] })}
                    className={inputCls}
                  >
                    <option value="">legal…</option>
                    {LEGAL_STATUSES.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                  <input
                    value={s.quality_note ?? ""}
                    onChange={(e) => setScan(idx, { quality_note: e.target.value })}
                    placeholder="quality note"
                    className={inputCls}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditNoteField show={!isAdmin} value={note} onChange={setNote} />

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-violet-700 text-white text-sm px-5 py-2 rounded-md font-medium hover:bg-violet-800 disabled:opacity-40 transition-colors"
        >
          {mutation.isPending
            ? isAdmin ? "Saving…" : "Submitting…"
            : isAdmin ? "Save issue" : "Submit for review"}
        </button>
        <Link to={`/works/${magazineId}`} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </Link>
        {mutation.isError && (
          <span className="text-sm text-red-500">
            {(mutation.error as Error)?.message || "Save failed — try again."}
          </span>
        )}
      </div>
    </form>
  );
}
