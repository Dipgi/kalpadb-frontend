import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const BROWSE_LINKS = [
  { to: "/browse", label: "Works" },
  { to: "/magazines", label: "Magazines" },
  { to: "/series", label: "Series" },
  { to: "/persons", label: "People" },
  { to: "/publishers", label: "Publishers" },
  { to: "/explore", label: "Explore" },
];

function Chevron() {
  return (
    <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  // Which desktop dropdown is open: "browse" | "account" | null
  const [open, setOpen] = useState<null | "browse" | "account">(null);

  function handleLogout() {
    setOpen(null);
    setMenuOpen(false);
    logout();
    navigate("/");
  }

  const isAdmin = user?.role.toLowerCase() === "admin";
  const isContributor = user && ["admin", "volunteer"].includes(user.role.toLowerCase());

  return (
    <>
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          to="/"
          onClick={() => setOpen(null)}
          className="text-xl font-bold text-violet-700 tracking-tight"
        >
          KalpaDB
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          {/* Browse — catalogue links grouped */}
          <div className="relative">
            <button
              onClick={() => setOpen((o) => (o === "browse" ? null : "browse"))}
              aria-expanded={open === "browse"}
              aria-haspopup="true"
              className="flex items-center gap-1 hover:text-gray-900"
            >
              Browse <Chevron />
            </button>
            {open === "browse" && (
              <div className="absolute left-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                {BROWSE_LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(null)}
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/search" onClick={() => setOpen(null)} className="hover:text-gray-900">Search</Link>
          {user && (
            <Link to="/contribute" onClick={() => setOpen(null)} className="hover:text-gray-900">Contribute</Link>
          )}
          <Link to="/help" onClick={() => setOpen(null)} className="hover:text-gray-900">Help</Link>

          {user ? (
            /* Account — personal links grouped behind an avatar */
            <div className="relative">
              <button
                onClick={() => setOpen((o) => (o === "account" ? null : "account"))}
                aria-expanded={open === "account"}
                aria-haspopup="true"
                className="flex items-center gap-2 hover:text-gray-900"
              >
                <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold flex items-center justify-center uppercase">
                  {user.username.charAt(0)}
                </span>
                <span className="max-w-[8rem] truncate">{user.username}</span>
                <Chevron />
              </button>
              {open === "account" && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                  <Link to="/shelf" onClick={() => setOpen(null)} className="block px-4 py-2 text-gray-700 hover:bg-gray-50">
                    My Shelf
                  </Link>
                  {isContributor && (
                    <Link to="/my-submissions" onClick={() => setOpen(null)} className="block px-4 py-2 text-gray-700 hover:bg-gray-50">
                      My Submissions
                    </Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setOpen(null)} className="block px-4 py-2 text-violet-600 font-medium hover:bg-gray-50">
                      Admin
                    </Link>
                  )}
                  <div className="my-1 border-t border-gray-100" />
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-gray-500 hover:bg-gray-50">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(null)} className="hover:text-gray-900">Sign in</Link>
              <Link
                to="/register"
                onClick={() => setOpen(null)}
                className="bg-violet-700 text-white px-3 py-1.5 rounded-md hover:bg-violet-800 transition-colors"
              >
                Join
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 px-4 py-3 flex flex-col gap-3 text-sm text-gray-700 bg-white">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Browse</p>
          {BROWSE_LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className="pl-2">
              {l.label}
            </Link>
          ))}
          <Link to="/search" onClick={() => setMenuOpen(false)} className="pl-2">Search</Link>
          <Link to="/help" onClick={() => setMenuOpen(false)} className="pl-2">Help</Link>

          <div className="border-t border-gray-100 pt-3 flex flex-col gap-3">
            {user ? (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {user.username}
                </p>
                <Link to="/contribute" onClick={() => setMenuOpen(false)} className="pl-2">Contribute</Link>
                <Link to="/shelf" onClick={() => setMenuOpen(false)} className="pl-2">My Shelf</Link>
                {isContributor && (
                  <Link to="/my-submissions" onClick={() => setMenuOpen(false)} className="pl-2">My Submissions</Link>
                )}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMenuOpen(false)} className="pl-2 text-violet-600 font-medium">Admin</Link>
                )}
                <button onClick={handleLogout} className="text-left pl-2 text-gray-500">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="pl-2">Sign in</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="pl-2">Join</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>

    {/* Click-away layer below the sticky header (z-40 < header z-50), so the
        header stays interactive while open dropdowns dismiss on an outside click. */}
    {open && (
      <button
        aria-hidden
        tabIndex={-1}
        onClick={() => setOpen(null)}
        className="fixed inset-0 z-40 cursor-default"
      />
    )}
    </>
  );
}
