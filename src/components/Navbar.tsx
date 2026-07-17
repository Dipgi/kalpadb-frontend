import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { admin, messages } from "../lib/api";

const BROWSE_LINKS = [
  { to: "/browse", label: "Works" },
  { to: "/magazines", label: "Magazines" },
  { to: "/issues", label: "Issues" },
  { to: "/series", label: "Series" },
  { to: "/persons", label: "People" },
  { to: "/publishers", label: "Publishers" },
  { to: "/awards", label: "Awards" },
  { to: "/explore", label: "Explore" },
];

function Chevron() {
  return (
    <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/** Admin-only pill: a short label + a count bubble, linking straight to the
 *  page where the pending items are actioned. */
function PendingPill({
  to,
  label,
  count,
  onClick,
}: {
  to: string;
  label: string;
  count: number;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      title={`${count} pending ${label.toLowerCase()} — click to review`}
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
    >
      {label}
      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-500 text-white text-[11px] font-semibold leading-none">
        {count}
      </span>
    </Link>
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

  // Admins see live pending-work counts at the top level so they don't have to
  // dig into the dashboard. Polls periodically so new items surface without a reload.
  const { data: pending } = useQuery({
    queryKey: ["admin-pending-counts"],
    queryFn: admin.pendingCounts,
    enabled: !!isAdmin,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const pendingEdits = isAdmin ? (pending?.edit_queue ?? 0) : 0;
  const pendingRequests = isAdmin ? (pending?.volunteer_requests ?? 0) : 0;
  const pendingMessages = isAdmin ? (pending?.unread_messages ?? 0) : 0;

  // Every signed-in user polls their own unread count for the account-menu badge.
  const { data: myUnread } = useQuery({
    queryKey: ["my-unread"],
    queryFn: messages.myUnread,
    enabled: !!user,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const unread = myUnread?.unread ?? 0;

  const messagesLink = (onClick: () => void, mobile = false) => (
    <Link
      to="/messages"
      onClick={onClick}
      className={
        mobile
          ? "pl-2 flex items-center gap-2"
          : "flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-50"
      }
    >
      Messages
      {unread > 0 && (
        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-violet-600 text-white text-[11px] font-semibold leading-none">
          {unread}
        </span>
      )}
    </Link>
  );

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

          {/* Admin-only pending-work badges — top level so they're seen at a glance */}
          {pendingEdits > 0 && (
            <PendingPill to="/admin/queue" label="Edits" count={pendingEdits} onClick={() => setOpen(null)} />
          )}
          {pendingRequests > 0 && (
            <PendingPill
              to="/admin/volunteer-requests"
              label="Requests"
              count={pendingRequests}
              onClick={() => setOpen(null)}
            />
          )}
          {pendingMessages > 0 && (
            <PendingPill
              to="/admin/messages"
              label="Messages"
              count={pendingMessages}
              onClick={() => setOpen(null)}
            />
          )}

          {user ? (
            /* Account — personal links grouped behind an avatar */
            <div className="relative">
              <button
                onClick={() => setOpen((o) => (o === "account" ? null : "account"))}
                aria-expanded={open === "account"}
                aria-haspopup="true"
                className="flex items-center gap-2 hover:text-gray-900"
              >
                <span className="relative w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold flex items-center justify-center uppercase">
                  {user.username.charAt(0)}
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-violet-600 ring-2 ring-white" />
                  )}
                </span>
                <span className="max-w-[8rem] truncate">{user.username}</span>
                <Chevron />
              </button>
              {open === "account" && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                  {user.auto_approve && (
                    <>
                      <div
                        className="px-4 py-2"
                        title="Your contributions publish immediately, without admin review"
                      >
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold uppercase tracking-wide">
                          Trusted volunteer
                        </span>
                      </div>
                      <div className="my-1 border-t border-gray-100" />
                    </>
                  )}
                  <Link to="/shelf" onClick={() => setOpen(null)} className="block px-4 py-2 text-gray-700 hover:bg-gray-50">
                    My Shelf
                  </Link>
                  {messagesLink(() => setOpen(null))}
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
          className="md:hidden relative p-2 text-gray-600"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={
            pendingEdits + pendingRequests > 0
              ? `Toggle menu — ${pendingEdits + pendingRequests} pending admin items`
              : "Toggle menu"
          }
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
          {!menuOpen && pendingEdits + pendingRequests > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
          )}
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
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  {user.username}
                  {user.auto_approve && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold normal-case tracking-wide">
                      Trusted volunteer
                    </span>
                  )}
                </p>
                {(pendingEdits > 0 || pendingRequests > 0 || pendingMessages > 0) && (
                  <div className="flex flex-wrap gap-2 pl-2">
                    {pendingEdits > 0 && (
                      <PendingPill to="/admin/queue" label="Edits" count={pendingEdits} onClick={() => setMenuOpen(false)} />
                    )}
                    {pendingRequests > 0 && (
                      <PendingPill
                        to="/admin/volunteer-requests"
                        label="Requests"
                        count={pendingRequests}
                        onClick={() => setMenuOpen(false)}
                      />
                    )}
                    {pendingMessages > 0 && (
                      <PendingPill
                        to="/admin/messages"
                        label="Messages"
                        count={pendingMessages}
                        onClick={() => setMenuOpen(false)}
                      />
                    )}
                  </div>
                )}
                <Link to="/contribute" onClick={() => setMenuOpen(false)} className="pl-2">Contribute</Link>
                <Link to="/shelf" onClick={() => setMenuOpen(false)} className="pl-2">My Shelf</Link>
                {messagesLink(() => setMenuOpen(false), true)}
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
