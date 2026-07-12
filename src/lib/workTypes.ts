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
