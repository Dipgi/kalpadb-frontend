import type { IssueIdentity, IssueType } from "./api";

/** Human-readable labels for the issue_type controlled vocabulary. */
export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  regular: "Regular",
  special: "Special",
  annual: "Annual",
  puja_annual: "Puja Annual",
  double: "Double issue",
  anniversary: "Anniversary",
};

/** Options for an issue_type dropdown, in entry-friendly order. */
export const ISSUE_TYPE_OPTIONS: { value: IssueType; label: string }[] = (
  ["regular", "special", "annual", "puja_annual", "double", "anniversary"] as IssueType[]
).map((value) => ({ value, label: ISSUE_TYPE_LABELS[value] }));

/**
 * Display string for a magazine issue. Prefers the curated native-script
 * issue_label (which carries the period — season/month + calendar year — that
 * structured fields can't express); otherwise composes a plain fallback from
 * volume/number/special_title. Returns null when nothing is known.
 */
export function issueDisplay(issue: Partial<IssueIdentity>): string | null {
  if (issue.issue_label) return issue.issue_label;
  const bits: string[] = [];
  if (issue.volume_number != null) bits.push(`Vol ${issue.volume_number}`);
  if (issue.issue_number != null) bits.push(`No ${issue.issue_number}`);
  let label = bits.join(", ") || null;
  if (issue.special_title) label = label ? `${label} — ${issue.special_title}` : issue.special_title;
  return label;
}

/**
 * Compose a native-script issue_label from a free-text period plus the
 * structured fields, e.g. ("নভেম্বর ১৯৮৭", 55, 4) → "নভেম্বর ১৯৮৭ - বর্ষ ৫৫, সংখ্যা ৪".
 * The period is the irreducible free part (Bengali-San year, season name); the
 * volume/number are rendered in the magazine's script. Used to pre-fill the
 * editable label field at data-entry time so no one hand-types the whole string.
 */
const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

function toBengaliDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)]);
}

export function composeIssueLabel(opts: {
  period?: string | null;
  volumeNumber?: number | null;
  issueNumber?: number | null;
  specialTitle?: string | null;
  bengali?: boolean;
}): string {
  const { period, volumeNumber, issueNumber, specialTitle, bengali = true } = opts;
  const num = (n: number) => (bengali ? toBengaliDigits(n) : String(n));
  const volWord = bengali ? "বর্ষ" : "Vol";
  const noWord = bengali ? "সংখ্যা" : "No";
  const volnum: string[] = [];
  if (volumeNumber != null) volnum.push(`${volWord} ${num(volumeNumber)}`);
  if (issueNumber != null) volnum.push(`${noWord} ${num(issueNumber)}`);
  const segments: string[] = [];
  if (period && period.trim()) segments.push(period.trim());
  if (volnum.length) segments.push(volnum.join(", "));
  if (specialTitle && specialTitle.trim()) segments.push(specialTitle.trim());
  return segments.join(" - ");
}
