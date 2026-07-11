/**
 * Build-time sitemap generator. Runs as an npm `prebuild` step (npm invokes it
 * automatically before `build`), enumerating the catalogue from the live API
 * and writing public/sitemap.xml (which Vite then copies into dist/).
 *
 * Resilient by design: the site is a client-rendered SPA, so a missing sitemap
 * badly hurts indexing — but a build must never fail just because the API is
 * asleep (Render free tier cold-starts). On any error we still emit a sitemap
 * of the static routes and exit 0.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SITE = "https://kalpadb.com";
const API = process.env.VITE_API_URL ?? "https://kalpa-api.onrender.com/api/v1";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/sitemap.xml");

// Public, indexable static routes (priority is a hint, not a guarantee).
const STATIC_ROUTES = [
  ["/", "1.0"],
  ["/browse", "0.9"],
  ["/explore", "0.7"],
  ["/magazines", "0.7"],
  ["/issues", "0.6"],
  ["/persons", "0.7"],
  ["/publishers", "0.6"],
  ["/series", "0.6"],
  ["/awards", "0.6"],
  ["/news", "0.5"],
  ["/about", "0.5"],
  ["/contact", "0.3"],
  ["/help", "0.3"],
  ["/license", "0.3"],
  ["/cite", "0.3"],
];

/** GET JSON with a timeout and one retry — tolerant of Render cold starts. */
async function getJson(url, { tries = 2, timeoutMs = 60000 } = {}) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === tries) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    } finally {
      clearTimeout(t);
    }
  }
}

/** Collect every `id` from a paginated `/list?page=` endpoint. */
async function collectIds(path) {
  const ids = [];
  let page = 1;
  for (;;) {
    const sep = path.includes("?") ? "&" : "?";
    const data = await getJson(`${API}${path}${sep}page=${page}&page_size=100`);
    for (const item of data.items ?? []) if (item?.id != null) ids.push(item.id);
    if (!data.pages || page >= data.pages || (data.items ?? []).length === 0) break;
    page += 1;
  }
  return ids;
}

function urlTag(loc, priority) {
  return `  <url><loc>${SITE}${loc}</loc>${priority ? `<priority>${priority}</priority>` : ""}</url>`;
}

async function main() {
  const rows = STATIC_ROUTES.map(([loc, p]) => urlTag(loc, p));

  const sources = [
    { label: "works", path: "/works", prefix: "/works/", priority: "0.8" },
    { label: "persons", path: "/persons", prefix: "/persons/", priority: "0.6" },
    { label: "publishers", path: "/publishers", prefix: "/publishers/", priority: "0.5" },
    { label: "series", path: "/series", prefix: "/series/", priority: "0.5" },
  ];

  for (const s of sources) {
    try {
      const ids = await collectIds(s.path);
      for (const id of ids) rows.push(urlTag(`${s.prefix}${id}`, s.priority));
      console.log(`[sitemap] ${s.label}: ${ids.length} urls`);
    } catch (err) {
      console.warn(`[sitemap] ${s.label} skipped (${err.message}) — API unreachable?`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.join("\n")}
</urlset>
`;
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, xml, "utf8");
  console.log(`[sitemap] wrote ${rows.length} urls → ${OUT}`);
}

main().catch((err) => {
  // Never break the build; emit static routes only.
  console.warn(`[sitemap] generation failed (${err.message}); writing static routes only.`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_ROUTES.map(([loc, p]) => urlTag(loc, p)).join("\n")}
</urlset>
`;
  try {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, xml, "utf8");
  } catch {
    /* give up silently — build proceeds without a sitemap */
  }
  process.exit(0);
});
