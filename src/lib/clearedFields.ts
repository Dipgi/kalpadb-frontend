/**
 * Helper for the admin edit forms: works out which fields an admin is about to
 * CLEAR (had a value before, now left blank). Admin edits send blank fields as
 * null, which the backend now applies as a real clear — so we warn first.
 */
export type ClearedField = { label: string; previous: string };

const isBlank = (v: unknown) => v === null || v === undefined || v === "";

/**
 * Given the field rows being saved, return those whose previous value was set
 * but whose new value is blank — i.e. the ones that will be cleared.
 */
export function findClearedFields(
  rows: { label: string; previous: unknown; next: unknown }[],
): ClearedField[] {
  return rows
    .filter((r) => !isBlank(r.previous) && isBlank(r.next))
    .map((r) => ({ label: r.label, previous: String(r.previous) }));
}
