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
  { value: "graphic_novel", label: "Comics / Graphic Novel" },
];
