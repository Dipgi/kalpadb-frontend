import type { MagazineFrequencyOut, PublicationFrequency } from "./api";

/** Human-readable labels for the publication-frequency vocabulary. */
export const FREQUENCY_LABELS: Record<PublicationFrequency, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  bimonthly: "Bimonthly",
  quarterly: "Quarterly",
  biannual: "Biannual",
  annual: "Annual",
  irregular: "Irregular",
};

/** Dropdown options in ascending-cadence order. */
export const FREQUENCY_OPTIONS: { value: PublicationFrequency; label: string }[] = (
  [
    "weekly",
    "fortnightly",
    "monthly",
    "bimonthly",
    "quarterly",
    "biannual",
    "annual",
    "irregular",
  ] as PublicationFrequency[]
).map((value) => ({ value, label: FREQUENCY_LABELS[value] }));

/** "1974–1980" · "1974–" · "–1980" · "" from a stint's year range. */
export function frequencyYears(f: Pick<MagazineFrequencyOut, "start_year" | "end_year">): string {
  if (f.start_year == null && f.end_year == null) return "";
  return `${f.start_year ?? ""}–${f.end_year ?? ""}`;
}

/** "Monthly (1980–1987)" for a single stint. */
export function frequencyLabel(f: MagazineFrequencyOut): string {
  const name = FREQUENCY_LABELS[f.frequency] ?? f.frequency;
  const years = frequencyYears(f);
  return years ? `${name} (${years})` : name;
}
