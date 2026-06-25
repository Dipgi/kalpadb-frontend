import { lazy, type ComponentType } from "react";

/**
 * Drop-in for React.lazy that survives stale chunk hashes after a redeploy.
 *
 * Cloudflare Pages serves freshly-hashed asset filenames on every build. A tab
 * still holding the previous index.html will try to dynamically import a chunk
 * whose hash no longer exists (e.g. ExplorePage-BcJEIzJ_.js → 404), throwing
 * "Failed to fetch dynamically imported module". When that happens we force a
 * single full reload so the browser fetches the new index.html (and the new
 * chunk names) before giving up.
 *
 * A sessionStorage flag guards against an infinite reload loop when the import
 * is failing for a real reason (offline, genuine 500) rather than a stale hash.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  const RELOAD_KEY = "chunk-reload-attempted";
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        // Hang until the reload swaps the document; never resolve/reject so no
        // error flashes in the meantime.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
