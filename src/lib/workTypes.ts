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

// ContentType values for MEDIA (screen / audio / interactive) works.
export const MEDIA_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "film", label: "Film" },
  { value: "tv_series", label: "TV series" },
  { value: "web_series", label: "Web series" },
  { value: "audio_drama", label: "Audio drama" },
  { value: "podcast", label: "Podcast" },
  { value: "audiobook", label: "Audiobook" },
  { value: "video_game", label: "Video game" },
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
