import { Link } from "react-router-dom";

export interface PublisherLike {
  id: number;
  name: string;
}

/** A single publisher name that links to its detail page. */
export function PublisherLink({
  publisher,
  className = "hover:text-violet-700",
}: {
  publisher: PublisherLike;
  className?: string;
}) {
  return (
    <Link to={`/publishers/${publisher.id}`} className={className}>
      {publisher.name}
    </Link>
  );
}

/**
 * A comma-separated list of publishers, each linking to its detail page.
 * Mirrors PersonList — keeps every publisher credit clickable across the site.
 */
export function PublisherList({
  publishers,
  className = "hover:text-violet-700",
}: {
  publishers: PublisherLike[];
  className?: string;
}) {
  return (
    <>
      {publishers.map((p, i) => (
        <span key={p.id}>
          {i > 0 && ", "}
          <PublisherLink publisher={p} className={className} />
        </span>
      ))}
    </>
  );
}
