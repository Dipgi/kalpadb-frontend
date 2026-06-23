import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { works, user, admin, catalogue, type Rating, type PublicReview } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { romanisedTitle } from "../lib/title";
import { Stars, StarPicker } from "../components/StarRating";

const SHELF_STATUSES: { value: string; label: string }[] = [
  { value: "want", label: "Want to Read" },
  { value: "in_progress", label: "Reading" },
  { value: "finished", label: "Read" },
  { value: "abandoned", label: "Dropped" },
];

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [shelfStatus, setShelfStatus] = useState<string | null>(null);

  const { data: work, isLoading } = useQuery({
    queryKey: ["work", id],
    queryFn: () => works.get(Number(id)),
    enabled: !!id,
  });

  const { data: seriesPage } = useQuery({ queryKey: ["all-series"], queryFn: catalogue.series });

  const shelfMutation = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      user.upsertShelf(work!.id, status),
    onSuccess: (_, { status }) => {
      setShelfStatus(status);
      qc.invalidateQueries({ queryKey: ["shelf"] });
    },
  });

  const { data: myRatings } = useQuery({
    queryKey: ["my-ratings"],
    queryFn: () => user.ratings(),
    enabled: !!me,
  });
  const myRating = myRatings?.items.find((r) => r.lw_id === Number(id)) ?? null;

  const rateMutation = useMutation({
    mutationFn: ({ rating, review }: { rating: number; review?: string | null }) =>
      user.upsertRating(work!.id, rating, review),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ratings"] });
      qc.invalidateQueries({ queryKey: ["work", id] });
    },
  });

  const unrateMutation = useMutation({
    mutationFn: () => user.deleteRating(work!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ratings"] });
      qc.invalidateQueries({ queryKey: ["work", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
        <div className="flex gap-8">
          <div className="w-48 aspect-[2/3] bg-gray-100 rounded-lg shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-7 bg-gray-100 rounded w-2/3" />
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">
        Work not found.
      </div>
    );
  }

  const coverUrl =
    work.image_urls?.[0] ??
    work.book?.formats?.[0]?.cover_image_url ??
    null;

  const publicationYear = work.book?.publication_year
    ?? (work.publication_date ? work.publication_date.slice(0, 4) : null);

  const publishers = work.book?.publishers ?? [];
  const formats = work.book?.formats ?? [];
  const hasDetails =
    formats.length > 0 || work.book?.edition_label || work.book?.edition_notes;
  const seriesName =
    work.book?.series_id != null
      ? (seriesPage?.items.find((s) => s.id === work.book?.series_id)?.name ?? null)
      : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row gap-8 mb-10">
        {/* Cover */}
        <div className="w-40 md:w-48 shrink-0">
          {coverUrl ? (
            <img src={coverUrl} alt={work.title} className="w-full rounded-lg shadow-md" />
          ) : (
            <div className="w-full aspect-[2/3] bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{work.title}</h1>
            {me &&
              ["admin", "volunteer"].includes(me.role.toLowerCase()) &&
              work.type === "BOOK" && (
                <Link
                  to={
                    me.role.toLowerCase() === "admin"
                      ? `/admin/edit/${work.id}`
                      : `/works/${work.id}/edit`
                  }
                  className="shrink-0 text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-700 transition-colors"
                >
                  {me.role.toLowerCase() === "admin" ? "Edit ✎" : "Suggest an edit ✎"}
                </Link>
              )}
          </div>
          {romanisedTitle(work.localised, work.title, work.language) && (
            <p className="text-base text-gray-400 italic mb-1">
              {romanisedTitle(work.localised, work.title, work.language)}
            </p>
          )}
          <p className="text-gray-500 mb-3">
            {work.authors.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <Link to={`/persons/${a.id}`} className="hover:text-violet-700">{a.name}</Link>
              </span>
            ))}
            {publicationYear && <span> · {publicationYear}</span>}
          </p>

          {work.rating_count > 0 && work.avg_rating != null && (
            <div className="flex items-center gap-2 mb-3">
              <Stars value={work.avg_rating} />
              <span className="text-sm text-gray-600 font-medium">{work.avg_rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">
                ({work.rating_count} rating{work.rating_count > 1 ? "s" : ""})
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full capitalize">
              {work.type.toLowerCase()}
            </span>
            {work.language && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full uppercase">
                {work.language}
              </span>
            )}
            {work.genres?.map((g) => (
              <span key={g.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                {g.genre_name}
              </span>
            ))}
            {work.tags?.map((t) => (
              <span key={`tag-${t.id}`} className="bg-violet-50 text-violet-700 text-xs px-2 py-0.5 rounded-full">
                #{t.tag_name}
              </span>
            ))}
          </div>

          {work.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-4">{work.description}</p>
          )}

          {me && (
            <div className="flex flex-wrap gap-2">
              {SHELF_STATUSES.map(({ value, label }) => (
                <button
                  key={value}
                  disabled={shelfMutation.isPending}
                  onClick={() => shelfMutation.mutate({ status: value })}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    shelfStatus === value
                      ? "bg-violet-700 text-white border-violet-700"
                      : "border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {me && (
            <RatingSection
              key={myRating?.id ?? "none"}
              myRating={myRating}
              isPending={rateMutation.isPending || unrateMutation.isPending}
              onRate={(rating, review) => rateMutation.mutate({ rating, review })}
              onClear={() => unrateMutation.mutate()}
            />
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {publishers.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Publishers</h3>
            <p className="text-sm text-gray-700">{publishers.map((p) => p.name).join(", ")}</p>
          </div>
        )}

        {hasDetails && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Details</h3>
            <div className="text-sm text-gray-700 space-y-3">
              {(work.book?.edition_label || work.book?.edition_notes) && (
                <div className="space-y-1">
                  {work.book?.edition_label && <p>Edition: {work.book.edition_label}</p>}
                  {work.book?.edition_notes && (
                    <p className="text-gray-500">{work.book.edition_notes}</p>
                  )}
                </div>
              )}
              {formats.map((f, i) => (
                <div
                  key={i}
                  className={formats.length > 1 ? "border-l-2 border-gray-100 pl-3 space-y-1" : "space-y-1"}
                >
                  {f.format_type && <p className="font-medium capitalize">{f.format_type}</p>}
                  {f.page_count && <p>Pages: {f.page_count}</p>}
                  {f.isbn && <p>ISBN: {f.isbn}</p>}
                  {f.availability && <p>Availability: {f.availability.replace(/_/g, " ")}</p>}
                  {f.price && (
                    <p>
                      Price: {f.price}
                      {f.currency ? ` ${f.currency}` : ""}
                    </p>
                  )}
                  {f.notes && <p className="text-gray-500">{f.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {work.book?.series_id != null && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Series</h3>
            <p className="text-sm text-gray-700">
              <Link
                to={`/series/${work.book.series_id}`}
                className="text-violet-700 hover:underline"
              >
                {seriesName ?? `Series #${work.book.series_id}`}
              </Link>
              {work.book.series_position != null && ` (book ${work.book.series_position})`}
            </p>
          </div>
        )}

        {work.book?.translators && work.book.translators.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Translators</h3>
            <p className="text-sm text-gray-700">
              {work.book.translators.map((t) => t.name).join(", ")}
            </p>
          </div>
        )}

        {work.book?.editors && work.book.editors.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Editors</h3>
            <p className="text-sm text-gray-700">{work.book.editors.map((e) => e.name).join(", ")}</p>
          </div>
        )}

        {work.book?.illustrators && work.book.illustrators.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Illustrators</h3>
            <p className="text-sm text-gray-700">{work.book.illustrators.map((i) => i.name).join(", ")}</p>
          </div>
        )}

        {work.book?.cover_artists && work.book.cover_artists.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cover artists</h3>
            <p className="text-sm text-gray-700">{work.book.cover_artists.map((c) => c.name).join(", ")}</p>
          </div>
        )}

        {work.awards?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Awards</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {work.awards.map((a) => (
                <li key={a.id}>
                  {a.category.name} ({a.year}) — {a.result}
                </li>
              ))}
            </ul>
          </div>
        )}

        {work.related_works?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Related Works</h3>
            <ul className="text-sm space-y-1">
              {work.related_works.map((r) => (
                <li key={r.id}>
                  <Link to={`/works/${r.work.id}`} className="text-violet-700 hover:underline">
                    {r.work.title}
                  </Link>
                  {r.work.language && (
                    <span className="text-gray-400 ml-1 uppercase text-xs">{r.work.language}</span>
                  )}
                  <span className="text-gray-400 ml-1 text-xs">({r.relation_type})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {work.external_links?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Links</h3>
            <ul className="text-sm space-y-1">
              {work.external_links.map((l) => (
                <li key={l.id}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer"
                    className="text-violet-700 hover:underline">
                    {l.label ?? l.link_type}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ReviewsSection workId={work.id} isAdmin={me?.role.toLowerCase() === "admin"} />
    </div>
  );
}

function ReviewsSection({ workId, isAdmin }: { workId: number; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", workId, page],
    queryFn: () => works.reviews(workId, page),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => admin.reviews.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews", workId] });
      qc.invalidateQueries({ queryKey: ["work", String(workId)] }); // avg may change
    },
  });

  if (isLoading) return null;
  const reviews = data?.items ?? [];
  if (reviews.length === 0) return null;

  return (
    <div className="border-t border-gray-100 pt-6 mt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Reviews <span className="text-sm font-normal text-gray-400">({data?.total ?? 0})</span>
      </h2>
      <ul className="space-y-5">
        {reviews.map((r) => (
          <ReviewItem
            key={r.id}
            review={r}
            isAdmin={isAdmin}
            onDelete={() => deleteMutation.mutate(r.id)}
            deleting={deleteMutation.isPending}
          />
        ))}
      </ul>

      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-sm px-3 py-1 rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-violet-400"
          >
            ← Newer
          </button>
          <span className="text-sm text-gray-400 self-center">
            {page} / {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="text-sm px-3 py-1 rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-violet-400"
          >
            Older →
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewItem({
  review,
  isAdmin,
  onDelete,
  deleting,
}: {
  review: PublicReview;
  isAdmin: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const date = review.updated_at ?? review.created_at;

  return (
    <li className="flex gap-3">
      {review.user.image_url ? (
        <img
          src={review.user.image_url}
          alt={review.user.username}
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0 text-violet-500 text-sm font-medium">
          {review.user.username.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">{review.user.username}</span>
          <Stars value={review.rating} />
          {date && (
            <span className="text-xs text-gray-400">
              {new Date(date).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {isAdmin && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                if (confirm) onDelete();
                else setConfirm(true);
              }}
              onBlur={() => setConfirm(false)}
              className={`ml-auto text-xs px-2 py-0.5 rounded border transition-colors disabled:opacity-40 ${
                confirm
                  ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                  : "border-red-200 text-red-500 hover:bg-red-50"
              }`}
            >
              {deleting ? "Deleting…" : confirm ? "Confirm delete" : "Delete"}
            </button>
          )}
        </div>
        {review.review && (
          <p className="text-sm text-gray-600 leading-relaxed mt-1 whitespace-pre-line break-words">
            {review.review}
          </p>
        )}
      </div>
    </li>
  );
}

function RatingSection({
  myRating,
  isPending,
  onRate,
  onClear,
}: {
  myRating: Rating | null;
  isPending: boolean;
  onRate: (rating: number, review?: string | null) => void;
  onClear: () => void;
}) {
  const [review, setReview] = useState(myRating?.review ?? "");
  const [showReview, setShowReview] = useState(!!myRating?.review);

  useEffect(() => {
    setReview(myRating?.review ?? "");
  }, [myRating?.review]);

  const reviewChanged = review.trim() !== (myRating?.review ?? "");

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Your rating
        </span>
        <StarPicker
          value={myRating?.rating ?? null}
          disabled={isPending}
          onChange={(n) => onRate(n, review.trim() || null)}
        />
        {myRating && (
          <button
            onClick={onClear}
            disabled={isPending}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Clear
          </button>
        )}
        {myRating && !showReview && (
          <button
            onClick={() => setShowReview(true)}
            className="text-xs text-violet-600 hover:underline"
          >
            {myRating.review ? "Edit review" : "Add a review"}
          </button>
        )}
      </div>

      {showReview && myRating && (
        <div className="mt-3">
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Write a short review (optional)…"
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:border-violet-400 resize-y"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => onRate(myRating.rating, review.trim() || null)}
              disabled={isPending || !reviewChanged}
              className="text-xs px-3 py-1.5 rounded-md bg-violet-700 text-white disabled:opacity-40 hover:bg-violet-800 transition-colors"
            >
              Save review
            </button>
            <button
              onClick={() => {
                setShowReview(false);
                setReview(myRating.review ?? "");
              }}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:border-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
