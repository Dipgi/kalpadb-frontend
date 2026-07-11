import { Link } from "react-router-dom";

export interface PersonLike {
  id: number;
  name: string;
  credited_as?: string | null;
}

/** A single person name that links to their detail page, with optional byline. */
export function PersonLink({
  person,
  className = "hover:text-violet-700",
}: {
  person: PersonLike;
  className?: string;
}) {
  return (
    <>
      <Link to={`/persons/${person.id}`} className={className}>
        {person.name}
      </Link>
      {person.credited_as && (
        <span className="text-gray-400 text-sm"> (as {person.credited_as})</span>
      )}
    </>
  );
}

/**
 * A comma-separated list of people, each linking to their detail page.
 * Keeps every person credit clickable across the site (authors, translators,
 * editors, illustrators, cover artists, contributors, …).
 */
export function PersonList({
  people,
  className = "hover:text-violet-700",
}: {
  people: PersonLike[];
  className?: string;
}) {
  return (
    <>
      {people.map((p, i) => (
        <span key={p.id}>
          {i > 0 && ", "}
          <PersonLink person={p} className={className} />
        </span>
      ))}
    </>
  );
}
