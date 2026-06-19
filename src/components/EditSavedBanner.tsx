import { Link } from "react-router-dom";

/**
 * Success banner after saving an edit. Admins write live (auto-approved) and get a
 * "view it" link; volunteers get a "submitted for review" message + a link to track it.
 */
export default function EditSavedBanner({
  isAdmin,
  viewHref,
  viewLabel,
}: {
  isAdmin: boolean;
  viewHref: string;
  viewLabel: string;
}) {
  return (
    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3">
      {isAdmin ? (
        <>
          Saved.{" "}
          <Link to={viewHref} className="underline font-medium">
            {viewLabel} →
          </Link>
        </>
      ) : (
        <>
          Thanks — your edit was submitted for admin review and will go live once approved.{" "}
          <Link to="/my-submissions" className="underline font-medium">
            Track your submissions →
          </Link>
        </>
      )}
    </div>
  );
}
