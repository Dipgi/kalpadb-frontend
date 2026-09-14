// Person-to-person relationship vocabulary, shared by the relationships editor
// and the person detail page. Mirrors the backend StakeholderRelationshipCreate
// values in kalpa/api/schemas.py — see the StakeholderRelationship model for
// the full use-case doc (pen names, mentorships, biographical ties).

export const PERSON_RELATIONS = [
  "pen_name_of",
  "collective_pseudonym",
  "mentor_of",
  "influenced_by",
  "co_author_group",
  "spouse_of",
  "parent_of",
  "sibling_of",
] as const;

export type PersonRelationType = (typeof PERSON_RELATIONS)[number];

/** Human labels from the subject's (creator's) side. */
export const PERSON_RELATION_LABELS: Record<string, string> = {
  pen_name_of: "Pen name of",
  collective_pseudonym: "Contributes to collective pseudonym",
  mentor_of: "Mentor of",
  influenced_by: "Influenced by",
  co_author_group: "Member of group",
  spouse_of: "Spouse of",
  parent_of: "Parent of",
  sibling_of: "Sibling of",
};

/** Display-only inverse tokens, used when rendering from the object's side. */
const _INVERSE: Record<string, string> = {
  pen_name_of: "has_pen_name",
  collective_pseudonym: "pseudonym_includes",
  mentor_of: "mentee_of",
  influenced_by: "influence_on",
  co_author_group: "group_includes",
  // Symmetric — read the same from either side.
  spouse_of: "spouse_of",
  sibling_of: "sibling_of",
  parent_of: "child_of",
};

const _INVERSE_LABELS: Record<string, string> = {
  has_pen_name: "Pen name",
  pseudonym_includes: "Collective pseudonym includes",
  mentee_of: "Mentee of",
  influence_on: "Influence on",
  group_includes: "Group includes",
  child_of: "Child of",
};

/** Human label for a relation type; falls back to a de-underscored form. */
export function personRelationLabel(rt: string): string {
  return PERSON_RELATION_LABELS[rt] ?? _INVERSE_LABELS[rt] ?? rt.replace(/_/g, " ");
}

/** Relation type + label as it reads from the given person's point of view. */
export function personRelationFrom(
  relationType: string,
  personId: number,
  subjectId: number,
): string {
  return personId === subjectId ? relationType : (_INVERSE[relationType] ?? relationType);
}
