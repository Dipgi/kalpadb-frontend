import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { catalogue, type Person } from "../lib/api";
import type { PickerItem } from "./EntityPicker";

// Person-detail cache shared across all byline blocks on a page (a story's
// author and translator sections often show the same person) and across
// mounts within the session — aliases change rarely enough that stale reads
// are harmless for a suggestion list.
const personCache = new Map<number, Person>();
const personFetches = new Map<number, Promise<Person | null>>();

function fetchPerson(id: number): Promise<Person | null> {
  const cached = personCache.get(id);
  if (cached) return Promise.resolve(cached);
  let inflight = personFetches.get(id);
  if (!inflight) {
    inflight = catalogue
      .person(id)
      .then((p) => {
        personCache.set(id, p);
        return p;
      })
      .catch(() => null) // suggestions/hint just stay off for this person
      .finally(() => personFetches.delete(id));
    personFetches.set(id, inflight);
  }
  return inflight;
}

/** All recorded name forms of a person: canonical + localised + aliases. */
function knownNames(p: Person): string[] {
  const out = [p.name];
  for (const forms of Object.values(p.localised ?? {})) {
    const name = (forms as Record<string, string>).name;
    if (name) out.push(name);
  }
  for (const a of p.aliases ?? []) out.push(a.alias);
  return [...new Set(out.filter(Boolean))];
}

const norm = (s: string) => s.trim().normalize("NFC").toLocaleLowerCase();

/**
 * Optional per-credit "credited as" byline inputs, rendered under an author /
 * translator EntityPicker. One row per selected person; leave blank when the
 * work is credited under the canonical name. Example: story bylined "রনিন"
 * while the credit points at Goutam Mandal.
 *
 * Each input suggests the person's recorded aliases + name forms (datalist),
 * and a typed byline that matches none of them gets a non-blocking hint to
 * record it as a pen name — nothing is ever auto-added to the person.
 */
export default function BylineFields({
  people,
  bylines,
  onChange,
  admin = false,
}: {
  people: PickerItem[];
  bylines: Record<number, string>;
  onChange: (next: Record<number, string>) => void;
  /** Link the pen-name hint to the admin person editor instead of the volunteer one. */
  admin?: boolean;
}) {
  const [details, setDetails] = useState<Record<number, Person>>({});

  useEffect(() => {
    let cancelled = false;
    for (const p of people) {
      if (details[p.id]) continue;
      void fetchPerson(p.id).then((full) => {
        if (full && !cancelled) setDetails((prev) => (prev[p.id] ? prev : { ...prev, [p.id]: full }));
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people.map((p) => p.id).join(",")]);

  if (people.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {people.map((p) => {
        const value = bylines[p.id] ?? "";
        const full = details[p.id];
        const names = full ? knownNames(full) : [];
        // Hint only when we actually know the person's recorded names and the
        // typed byline matches none of them (loose compare: trim/NFC/case).
        const typed = value.trim();
        const unrecorded =
          !!full && typed.length >= 2 && !names.some((n) => norm(n) === norm(typed));
        return (
          <div key={p.id}>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs text-gray-400 w-40 truncate shrink-0" title={p.name}>
                {p.name}
              </span>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange({ ...bylines, [p.id]: e.target.value })}
                placeholder="credited as… (byline, optional)"
                list={`byline-suggestions-${p.id}`}
                className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <datalist id={`byline-suggestions-${p.id}`}>
                {names.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            {unrecorded && (
              <p className="mt-0.5 pl-[10.5rem] text-[11px] text-amber-600">
                “{typed}” is not a recorded alias of {p.name} —{" "}
                <Link
                  to={admin ? `/admin/edit-person/${p.id}` : `/persons/${p.id}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-amber-700"
                >
                  consider adding it as a pen name
                </Link>
                .
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Build the API `credited_as` map: only non-blank bylines for still-selected people. */
export function bylinePayload(
  people: PickerItem[],
  bylines: Record<number, string>
): Record<number, string> {
  const out: Record<number, string> = {};
  for (const p of people) {
    const v = (bylines[p.id] ?? "").trim();
    if (v) out[p.id] = v;
  }
  return out;
}
