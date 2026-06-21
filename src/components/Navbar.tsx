import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-violet-700 tracking-tight">
          KalpaDB
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <Link to="/browse" className="hover:text-gray-900">Browse</Link>
          <Link to="/persons" className="hover:text-gray-900">People</Link>
          <Link to="/publishers" className="hover:text-gray-900">Publishers</Link>
          <Link to="/search" className="hover:text-gray-900">Search</Link>
          <Link to="/help" className="hover:text-gray-900">Help</Link>
          {user ? (
            <>
              <Link to="/shelf" className="hover:text-gray-900">My Shelf</Link>
              <Link to="/contribute" className="hover:text-gray-900">Contribute</Link>
              {["admin", "volunteer"].includes(user.role.toLowerCase()) && (
                <Link to="/my-submissions" className="hover:text-gray-900">My Submissions</Link>
              )}
              {user.role.toLowerCase() === "admin" && (
                <Link to="/admin" className="hover:text-gray-900 text-violet-600 font-medium">Admin</Link>
              )}
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-900"
              >
                Sign out
              </button>
              <span className="text-gray-400 text-xs">{user.username}</span>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-gray-900">Sign in</Link>
              <Link
                to="/register"
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
          <Link to="/browse" onClick={() => setMenuOpen(false)}>Browse</Link>
          <Link to="/persons" onClick={() => setMenuOpen(false)}>People</Link>
          <Link to="/publishers" onClick={() => setMenuOpen(false)}>Publishers</Link>
          <Link to="/search" onClick={() => setMenuOpen(false)}>Search</Link>
          <Link to="/help" onClick={() => setMenuOpen(false)}>Help</Link>
          {user ? (
            <>
              <Link to="/shelf" onClick={() => setMenuOpen(false)}>My Shelf</Link>
              <Link to="/contribute" onClick={() => setMenuOpen(false)}>Contribute</Link>
              {["admin", "volunteer"].includes(user.role.toLowerCase()) && (
                <Link to="/my-submissions" onClick={() => setMenuOpen(false)}>My Submissions</Link>
              )}
              {user.role.toLowerCase() === "admin" && (
                <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-violet-600 font-medium">Admin</Link>
              )}
              <button onClick={handleLogout} className="text-left text-gray-500">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)}>Join</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
