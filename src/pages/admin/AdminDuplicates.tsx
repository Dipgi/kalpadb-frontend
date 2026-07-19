import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  admin,
  apiErrorMessage,
  type DuplicateCluster,
  type DuplicateMember,
  type DuplicateMergeKind,
  type DuplicateMergeResult,
  type DuplicateScanKind,
  type DuplicateScanResult,
} from "../../lib/api";

const TABS: { kind: DuplicateScanKind; label: string }[] = [
  { kind: "person", label: "People" },
  { kind: "publisher", label: "Publishers" },
  { kind: "book", label: "Books" },
  { kind: "story", label: "Short works" },
  { kind: "magazine", label: "Magazines" },
  { kind: "comic", label: "Comics" },
  { kind: "media", label: "Media" },
  { kind: "issue", label: "Issues" },
];

const TAB_LABEL = Object.fromEntries(TABS.map((t) => [t.kind, t.label])) as Record<
  DuplicateScanKind,
  string
>;

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

const FLAG_LABELS: Record<string, string> = {
  surname_differs: "⚠ surname differs",
  given_name_differs: "⚠ given name differs",
  authors_differ: "⚠ different authors",
  language_differs: "different language",
  same_volume_issue: "same volume+issue no.",
};

// Flags that suggest the pair is probably NOT a duplicate.
const WARN_FLAGS = new Set(["surname_differs", "given_name_differs", "authors_differ"]);

/** Public detail-page path for a member of the given scan kind. */
function detailPath(kind: DuplicateScanKind, m: DuplicateMember): string {
  switch (kind) {
    case "person":
      return `/persons/${m.id}`;
    case "publisher":
      return `/publishers/${m.id}`;
    case "issue":
      return `/magazines/${m.magazine_id}/issues/${m.id}`;
    default:
      return `/works/${m.id}`;
  }
}

const clusterKey = (c: DuplicateCluster) => c.members.map((m) => m.id).join("-");

// "Ignore for now" lives in localStorage only: hidden until the admin clears
// it (or a merge/dismissal makes the cluster disappear for real).
const ignoreStoreKey = (kind: DuplicateScanKind) => `dup-ignored:${kind}`;

function loadIgnored(kind: DuplicateScanKind): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(ignoreStoreKey(kind)) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveIgnored(kind: DuplicateScanKind, keys: Set<string>) {
  localStorage.setItem(ignoreStoreKey(kind), JSON.stringify([...keys]));
}

export default function AdminDuplicates() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<DuplicateScanKind>("person");
  const [ignored, setIgnored] = useState<Set<string>>(() => loadIgnored("person"));
  const [showIgnored, setShowIgnored] = useState(false);
  const [lastMerge, setLastMerge] = useState<string | null>(null);

  // Scans run only on an explicit Start; completed results are kept per tab so
  // switching tabs never re-triggers the (expensive) scan.
  const [results, setResults] = useState<
    Partial<Record<DuplicateScanKind, DuplicateScanResult>>
  >({});
  const [scanningKind, setScanningKind] = useState<DuplicateScanKind | null>(null);
  const [stopping, setStopping] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Detect a scan started by another admin (one scan at a time server-side).
  const status = useQuery({
    queryKey: ["dup-scan-status"],
    queryFn: admin.duplicates.scanStatus,
    refetchInterval: (q) => (q.state.data?.running ? 5000 : 20000),
  });
  const remoteScanRunning = !!status.data?.running && scanningKind === null;

  useEffect(() => {
    if (scanningKind === null) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [scanningKind]);

  const scanMutation = useMutation({
    mutationFn: (kind: DuplicateScanKind) => admin.duplicates.scan(kind),
    onSuccess: (res, kind) => {
      if (res.cancelled) {
        setScanNotice(
          `Scan of ${TAB_LABEL[kind].toLowerCase()} was stopped — partial results are discarded, previous results (if any) are kept.`
        );
      } else {
        setResults((prev) => ({ ...prev, [kind]: res }));
      }
    },
    onError: (err) => {
      setScanError(apiErrorMessage(err) ?? (err as Error).message ?? "Scan failed");
    },
    onSettled: () => {
      setScanningKind(null);
      setStopping(false);
      qc.invalidateQueries({ queryKey: ["dup-scan-status"] });
    },
  });

  const startScan = (kind: DuplicateScanKind) => {
    setScanNotice(null);
    setScanError(null);
    setLastMerge(null);
    setScanningKind(kind);
    scanMutation.mutate(kind);
  };

  const stopScan = async () => {
    setStopping(true);
    try {
      await admin.duplicates.cancelScan();
    } catch {
      setStopping(false);
    }
  };

  const current = results[tab];

  const dismissed = useQuery({
    queryKey: ["dup-dismissed", current?.merge_kind],
    queryFn: () => admin.duplicates.listDismissed(current!.merge_kind),
    enabled: !!current,
  });

  const switchTab = (k: DuplicateScanKind) => {
    setTab(k);
    setIgnored(loadIgnored(k));
    setShowIgnored(false);
    setLastMerge(null);
    setScanNotice(null);
    setScanError(null);
  };

  /** Drop a cluster from the kept results without rescanning (scans are slow). */
  const removeCluster = (key: string) => {
    setResults((prev) => {
      const res = prev[tab];
      if (!res) return prev;
      return {
        ...prev,
        [tab]: { ...res, clusters: res.clusters.filter((c) => clusterKey(c) !== key) },
      };
    });
  };

  const ignoreCluster = (key: string) => {
    const next = new Set(ignored);
    next.add(key);
    setIgnored(next);
    saveIgnored(tab, next);
  };

  const clearIgnored = () => {
    setIgnored(new Set());
    saveIgnored(tab, new Set());
  };

  const clusters = current?.clusters ?? [];
  const visible = useMemo(
    () => clusters.filter((c) => showIgnored || !ignored.has(clusterKey(c))),
    [clusters, ignored, showIgnored]
  );
  const ignoredCount = clusters.length - clusters.filter((c) => !ignored.has(clusterKey(c))).length;
  const scanningThisTab = scanningKind === tab;
  const anyScanRunning = scanningKind !== null || remoteScanRunning;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Find Duplicates</h1>
      <p className="text-sm text-gray-500 mb-4">
        Fuzzy-matches names and titles across scripts (honorifics and byline labels like{" "}
        <span className="font-medium">ড., শ্রী, মূল রচনা:, অনুবাদ:</span> are ignored). Review each
        cluster, then merge, ignore, or rule it not-a-duplicate.
      </p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.kind}
            onClick={() => switchTab(t.kind)}
            className={`text-sm px-4 py-1.5 rounded-md border transition-colors ${
              tab === t.kind
                ? "bg-violet-700 text-white border-violet-700"
                : "border-gray-300 text-gray-600 hover:border-violet-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {lastMerge && (
        <div className="mb-4 text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-2.5">
          {lastMerge}
        </div>
      )}
      {scanNotice && (
        <div className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2.5">
          {scanNotice}
        </div>
      )}
      {scanError && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5">
          Scan failed: {scanError}
        </div>
      )}

      {scanningThisTab ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="inline-block h-6 w-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-600 font-medium">
            Scanning {TAB_LABEL[tab].toLowerCase()}… {formatElapsed(elapsed)}
          </p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Only {TAB_LABEL[tab].toLowerCase()} are compared. This can take a few minutes on the
            current server — the rest of the site stays responsive.
          </p>
          <button
            onClick={stopScan}
            disabled={stopping}
            className="text-sm px-4 py-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {stopping ? "Stopping…" : "Stop scan"}
          </button>
        </div>
      ) : scanningKind !== null ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
          A scan of <span className="font-medium">{TAB_LABEL[scanningKind].toLowerCase()}</span> is
          running ({formatElapsed(elapsed)}) — switch to that tab to watch or stop it.
        </div>
      ) : remoteScanRunning ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
          Another admin is running a scan right now — starting is disabled until it finishes (one
          scan at a time keeps the server responsive).
        </div>
      ) : !current ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-600 mb-1">
            Scan <span className="font-medium">{TAB_LABEL[tab].toLowerCase()}</span> for likely
            duplicates.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Compares only {TAB_LABEL[tab].toLowerCase()} against each other — not the whole
            catalogue. Takes up to a few minutes; you can stop it at any time.
          </p>
          <button
            onClick={() => startScan(tab)}
            disabled={anyScanRunning}
            className="text-sm px-5 py-2 rounded-md bg-violet-700 text-white font-medium hover:bg-violet-800 disabled:opacity-50"
          >
            Start scan
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 text-sm text-gray-500 flex-wrap gap-2">
            <span>
              {visible.length} candidate cluster{visible.length === 1 ? "" : "s"} ·{" "}
              {current.scanned} records scanned
              {current.dismissed_pairs > 0 &&
                ` · ${current.dismissed_pairs} pair(s) previously ruled not-duplicate`}
            </span>
            <span className="flex items-center gap-3">
              {ignoredCount > 0 && (
                <>
                  <button
                    onClick={() => setShowIgnored((s) => !s)}
                    className="text-violet-700 hover:underline"
                  >
                    {showIgnored ? "Hide" : "Show"} {ignoredCount} ignored
                  </button>
                  <button onClick={clearIgnored} className="text-gray-400 hover:underline">
                    Clear ignored
                  </button>
                </>
              )}
              <button
                onClick={() => startScan(tab)}
                disabled={anyScanRunning}
                className="px-3 py-1.5 border border-gray-300 rounded-md hover:border-violet-400 disabled:opacity-50"
                title={anyScanRunning ? "A scan is already running" : ""}
              >
                Rescan
              </button>
            </span>
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-gray-400 bg-white border border-gray-200 rounded-lg p-6 text-center">
              No duplicate candidates found. 🎉
            </p>
          ) : (
            <div className="space-y-4">
              {visible.map((cluster) => (
                <ClusterCard
                  key={clusterKey(cluster)}
                  kind={tab}
                  mergeKind={current.merge_kind}
                  cluster={cluster}
                  isIgnored={ignored.has(clusterKey(cluster))}
                  onDone={(key, message) => {
                    removeCluster(key);
                    if (message) setLastMerge(message);
                    qc.invalidateQueries({ queryKey: ["dup-dismissed"] });
                  }}
                  onIgnore={ignoreCluster}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Not-duplicate rulings, with undo */}
      {(dismissed.data?.length ?? 0) > 0 && (
        <details className="mt-8">
          <summary className="text-sm font-medium text-gray-600 cursor-pointer">
            Not-duplicate rulings ({dismissed.data!.length})
          </summary>
          <div className="mt-3 space-y-1.5">
            {dismissed.data!.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between text-sm bg-white border border-gray-200 rounded px-3 py-2"
              >
                <span className="text-gray-600 truncate">
                  #{d.low_id} {d.low_label ?? ""} ≠ #{d.high_id} {d.high_label ?? ""}
                </span>
                <button
                  onClick={async () => {
                    await admin.duplicates.undismiss(d.id);
                    qc.invalidateQueries({ queryKey: ["dup-dismissed"] });
                  }}
                  className="text-xs text-violet-700 hover:underline shrink-0 ml-3"
                >
                  Undo
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ── One candidate cluster ────────────────────────────────────────────────────

function ClusterCard({
  kind,
  mergeKind,
  cluster,
  isIgnored,
  onDone,
  onIgnore,
}: {
  kind: DuplicateScanKind;
  mergeKind: DuplicateMergeKind;
  cluster: DuplicateCluster;
  isIgnored: boolean;
  onDone: (key: string, message?: string) => void;
  onIgnore: (key: string) => void;
}) {
  const key = clusterKey(cluster);
  // Default keeper: the member with the most references (most to lose).
  const defaultKeep = useMemo(
    () =>
      cluster.members.reduce((best, m) => (m.ref_count > best.ref_count ? m : best))
        .id,
    [cluster]
  );
  const [keepId, setKeepId] = useState(defaultKeep);
  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(cluster.members.map((m) => m.id))
  );
  const [error, setError] = useState<string | null>(null);

  const score = cluster.pairs.length ? Math.max(...cluster.pairs.map((p) => p.score)) : 0;
  const flags = [...new Set(cluster.pairs.flatMap((p) => p.flags))];

  const merge = useMutation({
    mutationFn: () =>
      admin.duplicates.merge(
        mergeKind,
        keepId,
        [...checked].filter((id) => id !== keepId)
      ),
    onSuccess: (res: DuplicateMergeResult) => {
      const moved = Object.values(res.repointed).reduce((a, b) => a + b, 0);
      onDone(
        key,
        `Merged ${res.merged_ids.map((i) => `#${i}`).join(", ")} into #${res.kept_id} — ` +
          `${moved} link(s) repointed` +
          (res.filled_fields.length ? `, filled: ${res.filled_fields.join(", ")}` : "") +
          (res.aliases_added ? `, ${res.aliases_added} alias(es) kept` : "") +
          (res.dropped_conflicts ? `, ${res.dropped_conflicts} overlapping link(s) deduped` : "")
      );
    },
    onError: (e: Error) => setError(e.message),
  });

  const dismiss = useMutation({
    mutationFn: () =>
      admin.duplicates.dismiss(
        mergeKind,
        cluster.members.map((m) => m.id)
      ),
    onSuccess: () => onDone(key),
    onError: (e: Error) => setError(e.message),
  });

  const mergeTargets = [...checked].filter((id) => id !== keepId);
  const canMerge = checked.has(keepId) && mergeTargets.length >= 1;

  const doMerge = () => {
    const keeper = cluster.members.find((m) => m.id === keepId)!;
    const victims = cluster.members.filter((m) => mergeTargets.includes(m.id));
    if (
      window.confirm(
        `Merge ${victims.map((v) => `#${v.id} “${v.label}”`).join(", ")}\n` +
          `into #${keeper.id} “${keeper.label}”?\n\n` +
          `All credits, links, ratings and bookmarks move to #${keeper.id}; ` +
          `blank fields are filled from the merged record(s); the merged record(s) ` +
          `are then permanently deleted. This cannot be undone.`
      )
    ) {
      setError(null);
      merge.mutate();
    }
  };

  return (
    <div
      className={`bg-white border rounded-lg p-4 ${
        isIgnored ? "border-dashed border-gray-300 opacity-60" : "border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
          {(score * 100).toFixed(0)}% match
        </span>
        {flags.map((f) => (
          <span
            key={f}
            className={`text-xs px-2 py-0.5 rounded-full ${
              WARN_FLAGS.has(f)
                ? "bg-amber-100 text-amber-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {FLAG_LABELS[f] ?? f}
          </span>
        ))}
        {isIgnored && <span className="text-xs text-gray-400">(ignored)</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400">
              <th className="pr-2 py-1 font-medium">Keep</th>
              <th className="pr-2 py-1 font-medium">Merge</th>
              <th className="pr-3 py-1 font-medium">Record</th>
              <th className="pr-3 py-1 font-medium">Links</th>
              <th className="py-1 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {cluster.members.map((m) => (
              <tr key={m.id} className="border-t border-gray-100 align-top">
                <td className="pr-2 py-2">
                  <input
                    type="radio"
                    name={`keep-${key}`}
                    checked={keepId === m.id}
                    onChange={() => setKeepId(m.id)}
                    className="accent-violet-600"
                    title="Keep this version"
                  />
                </td>
                <td className="pr-2 py-2">
                  <input
                    type="checkbox"
                    checked={checked.has(m.id)}
                    onChange={() =>
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (next.has(m.id)) next.delete(m.id);
                        else next.add(m.id);
                        return next;
                      })
                    }
                    className="accent-violet-600"
                    title="Include in this merge"
                  />
                </td>
                <td className="pr-3 py-2 min-w-0">
                  <Link
                    to={detailPath(kind, m)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-violet-700 hover:underline"
                  >
                    {m.label}
                  </Link>
                  <span className="ml-1.5 text-xs text-gray-400">#{m.id} ↗</span>
                  {m.native && m.native !== m.label && (
                    <div className="text-xs text-gray-500">{m.native}</div>
                  )}
                </td>
                <td className="pr-3 py-2 whitespace-nowrap text-gray-600">{m.ref_count}</td>
                <td className="py-2 text-xs text-gray-500">
                  {[
                    m.year ? String(m.year) : null,
                    m.language,
                    m.content_type,
                    m.authors.length ? `by ${m.authors.join(", ")}` : null,
                    m.has_image ? "🖼 has image" : null,
                    m.detail || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
        <button
          onClick={doMerge}
          disabled={!canMerge || merge.isPending || dismiss.isPending}
          className="text-xs px-3 py-1.5 rounded bg-violet-700 text-white font-medium hover:bg-violet-800 disabled:opacity-50"
          title={canMerge ? "" : "Pick a keeper and tick at least one other record"}
        >
          {merge.isPending
            ? "Merging…"
            : `Merge ${mergeTargets.length || ""} into #${keepId}`}
        </button>
        <button
          onClick={() => dismiss.mutate()}
          disabled={merge.isPending || dismiss.isPending}
          className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          title="Never show this cluster again"
        >
          {dismiss.isPending ? "Saving…" : "Not duplicates"}
        </button>
        <button
          onClick={() => onIgnore(key)}
          disabled={merge.isPending || dismiss.isPending || isIgnored}
          className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          title="Hide on this device until you clear ignored"
        >
          Ignore for now
        </button>
      </div>
    </div>
  );
}
