import { useEffect } from "react";

const SITE_NAME = "KalpaDB";
const DEFAULT_TITLE = "KalpaDB — Indian Speculative Fiction Database";
const DEFAULT_DESCRIPTION =
  "KalpaDB — Indian Speculative Fiction Database. A community-curated catalogue of speculative fiction (science fiction, fantasy, horror and more) across Indian languages and media.";
const ORIGIN = "https://kalpadb.com";

function upsertMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Sets per-route <title>, <meta name="description"> and <link rel="canonical">.
 * The site is a client-rendered SPA, so without this every route shipped the
 * same shell title/description — which reads to search engines as duplicate
 * pages. Pass the page-specific title (site name is appended) and, where there
 * is real prose, a description. `path` overrides the canonical path (defaults
 * to the current pathname, without query string).
 */
export function useSeo({
  title,
  description,
  path,
}: {
  title?: string;
  description?: string | null;
  path?: string;
}) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
    upsertMeta("description", clamp(description) || DEFAULT_DESCRIPTION);
    upsertCanonical(ORIGIN + (path ?? window.location.pathname));
  }, [title, description, path]);
}

/** Trim a description to a search-snippet-friendly length. */
function clamp(text?: string | null, max = 160): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + "…";
}
