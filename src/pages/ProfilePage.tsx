import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { profiles } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useSeo } from "../hooks/useSeo";
import Avatar from "../components/Avatar";

function roleBadge(role: string, autoApprove: boolean): { label: string; cls: string } | null {
  switch (role.toLowerCase()) {
    case "admin":
      return { label: "Admin", cls: "bg-violet-100 text-violet-700" };
    case "volunteer":
      return autoApprove
        ? { label: "Trusted volunteer", cls: "bg-amber-100 text-amber-700" }
        : { label: "Volunteer", cls: "bg-emerald-100 text-emerald-700" };
    default:
      return null;
  }
}

const memberSince = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "long" })
    : null;

export default function ProfilePage() {
  const { username = "" } = useParams();
  const { user: viewer } = useAuth();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => profiles.get(username),
    enabled: !!username,
  });
  const { data: stats } = useQuery({
    queryKey: ["profile-stats", username],
    queryFn: () => profiles.stats(username),
    enabled: !!username,
  });

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.username;

  // noindex: profiles are public but shouldn't be Google-indexed by name.
  useSeo({
    title: profile ? `${displayName} (@${profile.username})` : "Profile",
    description: profile?.bio ?? (profile ? `${displayName} on KalpaDB.` : undefined),
    noindex: true,
  });

  if (isLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-gray-400 text-center">Loading profile…</div>;
  }
  if (isError || !profile) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-gray-400 text-center">User not found.</div>;
  }

  const badge = roleBadge(profile.role, profile.auto_approve);
  const isSelf = viewer?.username === profile.username;
  const joined = memberSince(profile.created_at);

  const contributionTiles = [
    { label: "Entries created", value: stats?.entries_created },
    { label: "Entries edited", value: stats?.entries_edited },
    { label: "Works rated", value: stats?.works_rated },
    { label: "Reviews written", value: stats?.reviews_written },
    { label: "People followed", value: stats?.people_followed },
    { label: "Public lists", value: stats?.public_lists },
  ].filter((t) => t.value !== undefined);

  const byType = Object.entries(stats?.by_type ?? {});

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start gap-5">
        <Avatar url={profile.image_url} name={profile.username} sizeCls="w-24 h-24 text-3xl" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
            {badge && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${badge.cls}`}
              >
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">@{profile.username}</p>
          {joined && <p className="text-xs text-gray-400 mt-1">Member since {joined}</p>}
          {isSelf && (
            <Link
              to="/account"
              className="inline-block mt-2 text-sm text-violet-700 hover:text-violet-900 font-medium"
            >
              Edit profile
            </Link>
          )}
        </div>
      </div>

      {profile.bio && (
        <p className="mt-5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
      )}

      {/* Stats */}
      {contributionTiles.length > 0 && (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {contributionTiles.map((t) => (
            <div key={t.label} className="border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{t.value}</div>
              <div className="text-xs text-gray-500 mt-1">{t.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Contribution breakdown */}
      {byType.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Contributions by type
          </h2>
          <div className="flex flex-wrap gap-2">
            {byType.map(([label, n]) => (
              <span
                key={label}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700"
              >
                {label} <span className="font-semibold">{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Own pending/rejected — private, shown only to self (and admins) */}
      {stats?.pending_submissions != null && (
        <p className="mt-6 text-xs text-gray-400">
          {stats.pending_submissions} pending · {stats.rejected_submissions} rejected —{" "}
          {isSelf ? (
            <Link to="/my-submissions" className="text-violet-700 hover:underline">
              see your submissions
            </Link>
          ) : (
            "visible to admins only"
          )}
        </p>
      )}
    </div>
  );
}
