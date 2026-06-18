import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { admin } from "../../lib/api";

type NavItem = { to: string; label: string; end?: boolean; badge?: "edit_queue" | "volunteer_requests" };

const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/queue", label: "Edit Queue", badge: "edit_queue" },
  { to: "/admin/volunteer-requests", label: "Volunteer Requests", badge: "volunteer_requests" },
  { to: "/admin/news", label: "News" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/tagging", label: "Genre Tagging" },
  { to: "/admin/add", label: "Add Records" },
  { to: "/admin/catalogue", label: "Catalogue" },
  { to: "/admin/audit", label: "Activity Log" },
];

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const isAdmin = !!user && user.role.toLowerCase() === "admin";

  const { data: counts } = useQuery({
    queryKey: ["admin-pending-counts"],
    queryFn: admin.pendingCounts,
    enabled: isAdmin,
  });

  if (loading) return null;
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
      {/* Sidebar */}
      <nav className="w-44 shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Admin</p>
        <ul className="space-y-1">
          {NAV.map(({ to, label, end, badge }) => {
            const count = badge ? counts?.[badge] ?? 0 : 0;
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
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
