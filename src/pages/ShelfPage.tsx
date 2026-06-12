import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { user } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import WorkCard from "../components/WorkCard";
import { Stars } from "../components/StarRating";

const STATUS_LABELS: Record<string, string> = {
  want: "Want to Read",
  in_progress: "Currently Reading",
  finished: "Read",
  abandoned: "Dropped",
  re_reading: "Reading Again",
};

export default function ShelfPage() {
  const { user: me } = useAuth();
  const { data: shelfPage, isLoading } = useQuery({
    queryKey: ["shelf"],
    queryFn: user.shelf,
    enabled: !!me,
  });
  const shelf = shelfPage?.items;

  const { data: ratingsPage } = useQuery({
    queryKey: ["my-ratings"],
    queryFn: () => user.ratings(),
    enabled: !!me,
  });
  const myRatings = ratingsPage?.items ?? [];

  if (!me) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Sign in to see your shelf.</p>
        <Link
          to="/login"
          className="bg-violet-700 text-white px-5 py-2.5 rounded-md font-medium hover:bg-violet-800 transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-7 bg-gray-100 rounded w-1/4 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[2/3] bg-gray-100 rounded-lg" />
              <div className="h-3 bg-gray-100 rounded mt-2 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const grouped = Object.keys(STATUS_LABELS).reduce<Record<string, NonNullable<typeof shelf>>>(
    (acc, status) => {
      acc[status] = shelf?.filter((e) => e.status === status) ?? [];
      return acc;
    },
    {}
  );

  const hasAny = shelf && shelf.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Shelf</h1>

      {!hasAny ? (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">Your shelf is empty.</p>
          <Link to="/browse" className="text-violet-700 hover:underline text-sm">
            Browse the catalogue →
          </Link>
        </div>
      ) : (
        Object.entries(STATUS_LABELS).map(([status, label]) => {
          const entries = grouped[status];
          if (!entries || entries.length === 0) return null;
          return (
            <div key={status} className="mb-10">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                {label}
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({entries.length})
                </span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {entries.map((e) => e.work && (
                  <WorkCard key={e.lw_id} work={e.work} />
                ))}
              </div>
            </div>
          );
        })
      )}

      {myRatings.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            My Ratings
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({myRatings.length})
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {myRatings.map((r) => r.work && (
              <div key={r.id} className="flex flex-col gap-1">
                <WorkCard work={r.work} />
                <div className="flex items-center gap-1 px-1">
                  <Stars value={r.rating} size="w-3.5 h-3.5" />
                  {r.review && (
                    <span className="text-xs text-gray-400 truncate" title={r.review}>
                      — {r.review}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
