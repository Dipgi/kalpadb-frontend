import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/queue", label: "Edit Queue" },
  { to: "/admin/news", label: "News" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/tagging", label: "Genre Tagging" },
  { to: "/admin/add", label: "Add Records" },
  { to: "/admin/catalogue", label: "Catalogue" },
  { to: "/admin/audit", label: "Activity Log" },
];

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || user.role.toLowerCase() !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
      {/* Sidebar */}
      <nav className="w-44 shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Admin</p>
        <ul className="space-y-1">
          {NAV.map(({ to, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-violet-100 text-violet-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
