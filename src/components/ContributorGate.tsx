import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * Guards edit forms: only VOLUNTEER/ADMIN may submit edits. Anonymous users get a
 * login prompt; plain USERs get pointed at the request-access flow. Admins/volunteers
 * see the wrapped form.
 */
export default function ContributorGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading…</div>;

  if (!user) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-gray-600 mb-4">Please sign in to suggest an edit.</p>
        <Link to="/login" className="text-violet-700 underline font-medium">
          Sign in →
        </Link>
      </div>
    );
  }

  if (user.role.toLowerCase() === "user") {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-gray-600 mb-4">
          Editing the catalogue needs volunteer access. Your edits are reviewed by an admin before
          they go live.
        </p>
        <Link to="/contribute" className="text-violet-700 underline font-medium">
          Request volunteer access →
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
