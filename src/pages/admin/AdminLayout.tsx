import { useState } from "react";
import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { admin } from "../../lib/api";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  badge?: "edit_queue" | "volunteer_requests" | "unread_messages";
};

const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/queue", label: "Edit Queue", badge: "edit_queue" },
  { to: "/admin/volunteer-requests", label: "Volunteer Requests", badge: "volunteer_requests" },
  { to: "/admin/messages", label: "Messages", badge: "unread_messages" },
  { to: "/admin/news", label: "News" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/tagging", label: "Genre & Tag Tagging" },
  { to: "/admin/tags", label: "Tag Management" },
  { to: "/admin/awards", label: "Award Management" },
  { to: "/admin/add", label: "Add Records" },
  { to: "/admin/catalogue", label: "Catalogue" },
  { to: "/admin/duplicates", label: "Find Duplicates" },
  { to: "/admin/audit", label: "Activity Log" },
  { to: "/admin/guide", label: "Admin Guide" },
];

/** Which NAV entry matches the current path — same matching rule as NavLink's
 *  default (end: exact match; otherwise exact or a path segment beneath it). */
function activeNavItem(pathname: string): NavItem {
  return (
    NAV.find(({ to, end }) =>
      end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
    ) ?? NAV[0]
  );
}

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const isAdmin = !!user && user.role.toLowerCase() === "admin";
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data: counts } = useQuery({
    queryKey: ["admin-pending-counts"],
    queryFn: admin.pendingCounts,
    enabled: isAdmin,
  });

  if (loading) return null;
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const current = activeNavItem(location.pathname);
  const currentCount = current.badge ? (counts?.[current.badge] ?? 0) : 0;
  // Any pending items elsewhere, so the collapsed toggle doesn't hide them.
  const hasOtherPending = NAV.some(
    (item) => item.badge && item.to !== current.to && (counts?.[item.badge] ?? 0) > 0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 md:flex md:gap-8">
      {/* Nav: collapsed "current section ▾" toggle on mobile, fixed sidebar on md+ */}
      <nav className="md:w-44 md:shrink-0 mb-5 md:mb-0">
        <p className="hidden md:block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Admin
        </p>

        <button
          type="button"
          onClick={() => setMobileNavOpen((o) => !o)}
          aria-expanded={mobileNavOpen}
          className="md:hidden w-full flex items-center justify-between px-3 py-2.5 rounded-md border border-gray-200 bg-white text-sm text-gray-700"
        >
          <span className="flex items-center gap-2">
            <span className="font-medium">{current.label}</span>
            {currentCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-violet-600 text-white text-[11px] font-semibold">
                {currentCount}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5 text-gray-400">
            {hasOtherPending && (
              <span className="w-2 h-2 rounded-full bg-amber-500" aria-label="Pending items in another section" />
            )}
            <svg
              className={`w-3.5 h-3.5 transition-transform ${mobileNavOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        <ul
          className={`${mobileNavOpen ? "flex" : "hidden"} flex-col gap-1 mt-1 md:flex md:mt-0 md:space-y-1`}
        >
          {NAV.map(({ to, label, end, badge }) => {
            const count = badge ? (counts?.[badge] ?? 0) : 0;
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-violet-100 text-violet-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`
                  }
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-violet-600 text-white text-[11px] font-semibold">
                      {count}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
