/**
 * Auto-generated Latin romanisation of a work's title (e.g. अर्थतृष्णा → "arthatrishna"),
 * stored server-side as a `{lang}-Latn` LocalisedText value (e.g. bn-Latn, hi-Latn). Shown
 * to readers who can't read the original script. Returns null when there's none (e.g. the
 * title is already Latin).
 *
 * Pass the work's language to prefer that script's romanisation; otherwise the first
 * available `*-Latn` value is used.
 */
export function romanisedTitle(
  localised: Record<string, Record<string, string>> | undefined,
  title: string,
  language?: string | null,
): string | null {
  const titles = localised?.title;
  if (!titles) return null;

  // Prefer the work's own language romanisation; fall back to any *-Latn key.
  const preferred = language ? titles[`${language}-Latn`] : undefined;
  const roman =
    preferred ?? Object.entries(titles).find(([k]) => k.endsWith("-Latn"))?.[1];
  if (!roman) return null;

  // Don't repeat it if the canonical title is effectively the same text.
  if (roman.toLowerCase() === title.toLowerCase()) return null;
  return roman;
}
