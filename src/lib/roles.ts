/** Turn a credit-derived role key like "cover_artist" into "Cover artist". */
export function formatRole(role: string): string {
  const s = role.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
