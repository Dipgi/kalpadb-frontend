// Display names for the top-level work types. STORY is deliberately shown as
// "Short work": the type also holds poems, essays, interviews, reviews and
// nonfiction pieces (~34% of rows) — "Story" was a lie. The API/DB value stays
// STORY; only labels changed (renaming the enum would break URLs and history).
export const WORK_TYPE_LABELS: Record<string, { singular: string; plural: string }> = {
  BOOK: { singular: "Book", plural: "Books" },
  STORY: { singular: "Short work", plural: "Short works" },
  MAGAZINE: { singular: "Magazine", plural: "Magazines" },
  COMIC: { singular: "Comic", plural: "Comics" },
  MEDIA: { singular: "Media", plural: "Media" },
};

export function workTypeLabel(type: string, plural = false): string {
  const l = WORK_TYPE_LABELS[type.toUpperCase()];
  if (!l) return type.charAt(0) + type.slice(1).toLowerCase();
  return plural ? l.plural : l.singular;
}

// Book-relevant ContentType values for the admin work-type dropdown.
// `value` is the API enum value (lowercase); blank means "unspecified".
export const WORK_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "novel", label: "Novel" },
  { value: "novella", label: "Novella" },
  { value: "anthology", label: "Anthology (multi-author)" },
  { value: "collection", label: "Collection (single-author)" },
  { value: "nonfiction", label: "Nonfiction" },
  { value: "essay", label: "Essay" },
  { value: "poem", label: "Poetry" },
  // "Comics / Graphic Novel" was retired here: graphic works are catalogued as
  // the COMIC work type (its own tab), not a BOOK content_type. See the Comic
  // consolidation. Existing BOOK+graphic_novel records were migrated to COMIC.
];

// ContentType values relevant to a standalone Story / short work.
// Used for the story-type dropdown; `value` is the API enum value (lowercase).
export const STORY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "shortstory", label: "Short story" },
  { value: "novelette", label: "Novelette" },
  { value: "novella", label: "Novella" },
  { value: "poem", label: "Poem" },
  { value: "essay", label: "Essay" },
  { value: "nonfiction", label: "Nonfiction" },
  { value: "interview", label: "Interview" },
  { value: "review", label: "Review" },
];

// ContentType values for COMIC works.
export const COMIC_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "graphic_novel", label: "Graphic novel" },
  { value: "comic_issue", label: "Comic issue" },
  { value: "manga", label: "Manga" },
  { value: "comic_strip", label: "Comic strip" },
];

// ContentType values for MEDIA (screen / audio / stage / interactive) works.
export const MEDIA_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "film", label: "Film" },
  { value: "tv_series", label: "TV series" },
  { value: "web_series", label: "Web series" },
  { value: "audio_drama", label: "Audio drama (radio play)" },
  { value: "podcast", label: "Podcast" },
  { value: "audiobook", label: "Audiobook" },
  { value: "video_game", label: "Video game" },
  { value: "song", label: "Song / album" },
  { value: "drama", label: "Stage drama (theatre / jatra)" },
];

// Media content types that have seasons/episodes — drives whether the
// Seasons editor and total_seasons/total_episodes fields are shown.
export const EPISODIC_MEDIA_TYPES = new Set(["tv_series", "web_series", "podcast"]);

// Curated cast & crew role suggestions per media content type. The credit
// role is free text server-side; these seed the role dropdown, and the form
// offers an "Other…" escape hatch for anything not listed.
const SCREEN_ROLES = [
  "director",
  "writer",
  "producer",
  "actor",
  "voice_actor",
  "cinematographer",
  "composer",
  "editor",
  "vfx_supervisor",
  "narrator",
];
const AUDIO_ROLES = ["narrator", "voice_actor", "writer", "director", "producer", "sound_designer", "composer", "audio_engineer"];
export const MEDIA_ROLE_OPTIONS: Record<string, string[]> = {
  film: SCREEN_ROLES,
  tv_series: SCREEN_ROLES,
  web_series: SCREEN_ROLES,
  audio_drama: AUDIO_ROLES,
  podcast: AUDIO_ROLES,
  audiobook: AUDIO_ROLES,
  video_game: ["game_director", "game_designer", "game_writer", "game_composer", "lead_programmer", "art_director", "voice_actor"],
  song: ["singer", "lyricist", "composer", "music_director", "arranger"],
  drama: ["playwright", "director", "actor", "producer", "composer", "stage_designer", "costume_designer"],
};

// Adaptation relationship options (MediaAdaptation.adaptation_type).
export const ADAPTATION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "direct", label: "Direct (faithful adaptation)" },
  { value: "partial", label: "Partial (adapts part of the source)" },
  { value: "loose", label: "Loose (inspired by / based on)" },
  { value: "sequel", label: "Sequel to the source work" },
  { value: "prequel", label: "Prequel to the source work" },
];

/**
 * Category (content_type) options for a given work type. Empty for an unknown
 * or unset type — used to drive the Browse "category" filter so it always
 * matches the selected work type instead of always showing book categories.
 */
export function contentTypeOptionsFor(workType: string): { value: string; label: string }[] {
  switch (workType) {
    case "BOOK":
      return WORK_TYPE_OPTIONS;
    case "STORY":
      return STORY_TYPE_OPTIONS;
    case "COMIC":
      return COMIC_TYPE_OPTIONS;
    case "MEDIA":
      return MEDIA_TYPE_OPTIONS;
    default:
      return [];
  }
}
