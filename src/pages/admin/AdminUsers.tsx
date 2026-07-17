import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, type AdminUser } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

export default function AdminUsers() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);

  // Mirror of the backend guards (which are authoritative): nobody edits their
  // own account or the owner's; only the owner touches admins or grants admin.
  const rowLocked = (u: AdminUser) =>
    u.id === me?.id || !!u.is_owner || (!me?.is_owner && u.role.toLowerCase() === "admin");
  const roleOptions = (u: AdminUser) =>
    me?.is_owner || u.role.toLowerCase() === "admin"
      ? ["user", "volunteer", "admin"]
      : ["user", "volunteer"];

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => admin.users.list(page),
  });

  // Pending role change awaiting confirmation: { id, role } or null.
  const [pendingRole, setPendingRole] = useState<{ id: number; role: string } | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { role?: string; auto_approve?: boolean; is_active?: boolean };
    }) => admin.users.update(id, data),
    onSuccess: () => {
      setPendingRole(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        Users
        {data && (
          <span className="ml-2 text-sm font-normal text-gray-400">{data.total} total</span>
        )}
      </h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th
                  className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  title="Trusted volunteers: their contributions publish immediately, without review (still logged)"
                >
                  Auto-approve
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data?.items ?? []).map((u: AdminUser) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {u.username}
                    <span className="ml-1.5 text-xs text-gray-400">#{u.id}</span>
                    {u.is_owner && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold uppercase tracking-wide">
                        Owner
                      </span>
                    )}
                    {u.id === me?.id && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold uppercase tracking-wide">
                        You
                      </span>
                    )}
                    {u.id !== me?.id && (
                      <Link
                        to={`/admin/messages/${u.id}`}
                        className="ml-2 text-[11px] text-violet-600 hover:underline"
                        title={`Open the message thread with ${u.username}`}
                      >
                        Message
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.email ?? <span className="text-gray-300 italic">hidden</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={pendingRole?.id === u.id ? pendingRole.role : u.role.toLowerCase()}
                        disabled={updateMutation.isPending || rowLocked(u)}
                        onChange={(e) => {
                          const next = e.target.value;
                          // Clear pending if the selection returns to the current role.
                          setPendingRole(next === u.role.toLowerCase() ? null : { id: u.id, role: next });
                        }}
                        className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                      >
                        {roleOptions(u).map((r) => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                      {pendingRole?.id === u.id && (
                        <>
                          <button
                            onClick={() =>
                              // Send the lowercase enum value (UserRole: "user"|"volunteer"|"admin").
                              updateMutation.mutate({ id: u.id, data: { role: pendingRole.role } })
                            }
                            disabled={updateMutation.isPending}
                            className="text-xs px-2 py-1 rounded bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50"
                          >
                            {updateMutation.isPending ? "Saving…" : `Confirm → ${pendingRole.role}`}
                          </button>
                          <button
                            onClick={() => setPendingRole(null)}
                            disabled={updateMutation.isPending}
                            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.role.toLowerCase() === "volunteer" ? (
                      <button
                        onClick={() =>
                          updateMutation.mutate({ id: u.id, data: { auto_approve: !u.auto_approve } })
                        }
                        disabled={updateMutation.isPending || rowLocked(u)}
                        title={
                          u.auto_approve
                            ? "Trusted volunteer — contributions publish immediately. Click to revoke."
                            : "Contributions go to the review queue. Click to trust this volunteer."
                        }
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors disabled:cursor-default ${
                          u.auto_approve
                            ? "bg-amber-100 text-amber-700 enabled:hover:bg-amber-200"
                            : "bg-gray-100 text-gray-500 enabled:hover:bg-gray-200"
                        }`}
                      >
                        {u.auto_approve ? "Trusted" : "Reviewed"}
                      </button>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        updateMutation.mutate({ id: u.id, data: { is_active: !u.is_active } })
                      }
                      disabled={rowLocked(u)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors disabled:cursor-default ${
                        u.is_active
                          ? "bg-green-100 text-green-700 enabled:hover:bg-green-200"
                          : "bg-red-100 text-red-600 enabled:hover:bg-red-200"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">{page} / {data.pages}</span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
