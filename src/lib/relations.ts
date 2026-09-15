// Work-to-work relationship vocabulary, shared by the relationships editor and
// the work detail page. Mirrors the backend WorkRelationshipCreate.direction
// values and _INVERSE_RELATION display tokens in kalpa/api/routers/works.py.

/** Relation types a user can create, from the subject work's perspective. */
export const SERIAL_RELATIONS = ["continues", "continued_by"] as const;

export const NARRATIVE_RELATIONS = [
  "sequel_to",
  "prequel_of",
  "spinoff_of",
  "companion_to",
  "fix_up_of",
  "retelling_of",
  "inspired_by",
  "part_of_series",
] as const;

// Secondary material (ACADEMIC / COVERAGE items) linking to the SF work(s)
// they discuss — a different axis from the narrative relations above, so kept
// as its own option set rather than mixed in.
export const SECONDARY_MATERIAL_RELATIONS = ["discusses"] as const;

export type RelationType =
  | (typeof SERIAL_RELATIONS)[number]
  | (typeof NARRATIVE_RELATIONS)[number]
  | (typeof SECONDARY_MATERIAL_RELATIONS)[number];

/** Human labels for every relation, including object-side inverse-only tokens. */
export const RELATION_LABELS: Record<string, string> = {
  // Serial (magazine titles)
  continues: "Continues (predecessor)",
  continued_by: "Continued by (successor)",
  // Narrative (any work type)
  sequel_to: "Sequel to",
  prequel_of: "Prequel of",
  spinoff_of: "Spin-off of",
  companion_to: "Companion to",
  fix_up_of: "Fix-up of",
  retelling_of: "Retelling of",
  inspired_by: "Inspired by",
  part_of_series: "Part of series",
  // Inverse-only display tokens (never created directly)
  has_spinoff: "Has spin-off",
  fixed_up_into: "Fixed up into",
  retold_as: "Retold as",
  inspiration_for: "Inspiration for",
  // Secondary material (academic/coverage items about a work)
  discusses: "Discusses",
  discussed_in: "Discussed in",
};

/** Human label for a relation type; falls back to a de-underscored form. */
export function relationLabel(rt: string): string {
  return RELATION_LABELS[rt] ?? rt.replace(/_/g, " ");
}

/** Relation options offered when editing a work of the given type. */
export function relationOptionsFor(workType: string): readonly RelationType[] {
  // Serial rename/merge links only make sense between magazine titles.
  if (workType === "MAGAZINE") return SERIAL_RELATIONS;
  // Academic/coverage items link to the SF work(s) they discuss — a
  // different axis from sequel/prequel-style narrative relations.
  if (workType === "ACADEMIC" || workType === "COVERAGE") return SECONDARY_MATERIAL_RELATIONS;
  return NARRATIVE_RELATIONS;
}
