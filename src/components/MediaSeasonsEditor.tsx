import type { MediaSeason, MediaSeasonInput } from "../lib/api";

export interface SeasonRow {
  season_number: string;
  title: string;
  episode_count: string;
  release_year: string;
  platform: string;
}

const inputCls =
  "w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

/**
 * Season-level editor for episodic media (series/podcasts). One row per
 * season: number, optional title, episode count, release year, platform.
 * Per-episode entry is deferred (v1). Rows round-trip the full set — the
 * API replaces all seasons on save.
 */
export default function MediaSeasonsEditor({
  rows,
  onChange,
}: {
  rows: SeasonRow[];
  onChange: (rows: SeasonRow[]) => void;
}) {
  function update(i: number, patch: Partial<SeasonRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="border border-gray-100 rounded-md p-3 space-y-2 bg-gray-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">Season #</label>
                <input
                  type="number"
                  min={1}
                  value={row.season_number}
                  onChange={(e) => update(i, { season_number: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">Title (optional)</label>
                <input
                  value={row.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  placeholder="Part One"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">Episodes</label>
                <input
                  type="number"
                  min={1}
                  value={row.episode_count}
                  onChange={(e) => update(i, { episode_count: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">Release year</label>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={row.release_year}
                  onChange={(e) => update(i, { release_year: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">Platform</label>
                <input
                  value={row.platform}
                  onChange={(e) => update(i, { platform: e.target.value })}
                  placeholder="if it moved"
                  className={inputCls}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              className="text-xs text-red-500 hover:underline"
            >
              Remove season
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          onChange([
            ...rows,
            {
              season_number: String(rows.length + 1),
              title: "",
              episode_count: "",
              release_year: "",
              platform: "",
            },
          ])
        }
        className="mt-2 text-sm text-violet-700 hover:underline"
      >
        + Add season
      </button>
    </div>
  );
}

/** Rebuild editable rows from a work's existing seasons. */
export function seasonRowsFromExisting(seasons: MediaSeason[]): SeasonRow[] {
  return seasons.map((s) => ({
    season_number: String(s.season_number),
    title: s.title ?? "",
    episode_count: s.episode_count?.toString() ?? "",
    release_year: s.release_date ? s.release_date.slice(0, 4) : "",
    platform: s.platform ?? "",
  }));
}

/** Convert season rows into the API payload, dropping rows with no number. */
export function seasonRowsToPayload(rows: SeasonRow[]): MediaSeasonInput[] {
  return rows
    .filter((r) => r.season_number.trim())
    .map((r) => ({
      season_number: Number(r.season_number),
      title: r.title.trim() || null,
      episode_count: r.episode_count ? Number(r.episode_count) : null,
      release_date: r.release_year ? `${r.release_year}-01-01` : null,
      platform: r.platform.trim() || null,
    }));
}
