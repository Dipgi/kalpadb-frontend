import { MEDIA_ROLE_OPTIONS } from "./workTypes";

/** Turn a credit-derived role key like "cover_artist" into "Cover artist". */
export function formatRole(role: string): string {
  const s = role.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Grouped vocabulary for the optional "primary role" hint on person forms.
 * The hint is free text server-side and only displays until the person has a
 * real credit (roles are credit-derived after that). Media entries reuse the
 * media credits editor's vocabulary so the two never drift apart.
 */
export const ROLE_HINT_GROUPS: { label: string; roles: string[] }[] = [
  {
    label: "Books & stories",
    roles: ["author", "editor", "translator", "illustrator", "cover_artist"],
  },
  {
    label: "Comics",
    roles: ["comic_writer", "comic_artist", "comic_inker", "comic_colorist", "comic_letterer"],
  },
  {
    label: "Film & media",
    roles: Array.from(new Set(Object.values(MEDIA_ROLE_OPTIONS).flat())).sort(),
  },
];
