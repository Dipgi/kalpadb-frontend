/**
 * Auto-generated Latin romanisation of a work's title (e.g. অর্থতৃষ্ণা → "arthatrishna"),
 * stored server-side as a bn-Latn LocalisedText value. Shown to readers who can't read the
 * original script. Returns null when there's none (e.g. the title is already Latin).
 */
export function romanisedTitle(
  localised: Record<string, Record<string, string>> | undefined,
  title: string,
): string | null {
  const roman = localised?.title?.["bn-Latn"];
  if (!roman) return null;
  // Don't repeat it if the canonical title is effectively the same text.
  if (roman.toLowerCase() === title.toLowerCase()) return null;
  return roman;
}
