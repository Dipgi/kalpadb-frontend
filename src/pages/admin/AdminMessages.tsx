import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, messages } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { MessageBubble } from "../MessagesPage";

const MUTE_PRESETS: { label: string; hours: number }[] = [
  { label: "1 hour", hours: 1 },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
];

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Admin-only broadcast composer: sends one announcement into every active
 *  user's thread, behind a type-then-confirm step since it can't be unsent. */
function AnnouncementComposer() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () => messages.announce(text.trim()),
    onSuccess: (r) => {
      setResult(`Announcement sent to ${r.recipients} users.`);
      setText("");
      setConfirming(false);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-message-threads"] });
    },
    onError: (e) => {
      setResult(e instanceof ApiError ? e.message : "Could not send the announcement.");
      setConfirming(false);
    },
  });

  return (
    <div className="mb-5">
      {!open ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setOpen(true);
              setResult(null);
            }}
            className="text-sm px-3 py-1.5 rounded-md border border-violet-300 text-violet-700 hover:bg-violet-50 font-medium"
          >
            📢 New announcement
          </button>
          {result && <p className="text-sm text-gray-500">{result}</p>}
        </div>
      ) : (
        <div className="border border-violet-200 rounded-xl bg-violet-50/50 p-3">
          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2">
            New announcement — goes to every active user
          </p>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setConfirming(false);
            }}
            rows={3}
            maxLength={2000}
            placeholder="Write the announcement… (text only, appears in every user's Messages under an “Announcement” heading)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          />
          <div className="flex items-center gap-2 mt-2">
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                disabled={!text.trim()}
                className="text-sm px-3 py-1.5 rounded-md bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-50"
              >
                Send to all users…
              </button>
            ) : (
              <button
                onClick={() => send.mutate()}
                disabled={send.isPending}
                className="text-sm px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {send.isPending ? "Sending…" : "Confirm — send to every active user"}
              </button>
            )}
            <button
              onClick={() => {
                setOpen(false);
                setConfirming(false);
              }}
              className="text-sm px-3 py-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminMessages() {
  const { userId } = useParams<{ userId?: string }>();
  const selected = userId ? Number(userId) : null;
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [muteHours, setMuteHours] = useState(24);
  const [muteReason, setMuteReason] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: threads } = useQuery({
    queryKey: ["admin-message-threads"],
    queryFn: messages.threads,
    refetchInterval: 60_000,
  });

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["admin-message-thread", selected],
    queryFn: () => messages.thread(selected!),
    enabled: selected != null,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-message-threads"] });
    qc.invalidateQueries({ queryKey: ["admin-message-thread", selected] });
    qc.invalidateQueries({ queryKey: ["admin-pending-counts"] });
  };

  const reply = useMutation({
    mutationFn: (text: string) => messages.reply(selected!, text),
    onSuccess: () => {
      setBody("");
      setError(null);
      invalidate();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not send."),
  });

  const muteMut = useMutation({
    mutationFn: () => messages.mute(selected!, muteHours, muteReason.trim() || undefined),
    onSuccess: () => {
      setMuteReason("");
      invalidate();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not mute."),
  });

  const unmuteMut = useMutation({
    mutationFn: () => messages.unmute(selected!),
    onSuccess: invalidate,
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not unmute."),
  });

  useEffect(() => {
    setError(null);
    setBody("");
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length, selected]);

  const isMuted = !!thread?.muted_until && new Date(thread.muted_until).getTime() > Date.now();

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Messages</h1>
      <p className="text-sm text-gray-500 mb-5">
        Threads between users and the admin team — any admin can read and reply to any thread.
        To start a new thread, message the user from here after finding them, or open{" "}
        <Link to="/admin/users" className="text-violet-700 hover:underline">
          Users
        </Link>{" "}
        to look up an account.
      </p>

      <AnnouncementComposer />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Thread list */}
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden self-start">
          {!threads || threads.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No message threads yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[65vh] overflow-y-auto">
              {threads.map((t) => (
                <li key={t.user_id}>
                  <button
                    onClick={() => navigate(`/admin/messages/${t.user_id}`)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 ${
                      selected === t.user_id ? "bg-violet-50" : ""
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {t.username}
                        {t.muted_until && new Date(t.muted_until).getTime() > Date.now() && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 align-middle">
                            muted
                          </span>
                        )}
                      </span>
                      {t.unread > 0 && (
                        <span className="shrink-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-violet-600 text-white text-[11px] font-semibold">
                          {t.unread}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-gray-500 truncate mt-0.5">
                      {t.last_from_admin ? "You: " : ""}
                      {t.last_body}
                    </span>
                    <span className="block text-[10px] text-gray-400 mt-0.5">{when(t.last_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Thread view */}
        <div className="border border-gray-200 rounded-xl bg-white flex flex-col min-h-[24rem]">
          {selected == null ? (
            <p className="text-sm text-gray-400 m-auto p-8">Select a thread to read it.</p>
          ) : threadLoading ? (
            <p className="text-sm text-gray-400 m-auto p-8">Loading…</p>
          ) : thread ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
                <div>
                  <Link
                    to={`/admin/users?q=${encodeURIComponent(thread.username)}`}
                    className="text-sm font-semibold text-gray-900 hover:text-violet-700"
                  >
                    {thread.username}
                  </Link>
                  <span className="ml-2 text-xs text-gray-400">{thread.role.toLowerCase()}</span>
                  {isMuted && (
                    <span className="ml-2 text-xs text-amber-700">
                      muted until {when(thread.muted_until!)}
                      {thread.mute_reason ? ` — ${thread.mute_reason}` : ""}
                    </span>
                  )}
                </div>
                {/* Mute controls — flood-control precaution */}
                {thread.role.toLowerCase() !== "admin" && (
                  <div className="flex items-center gap-1.5">
                    {isMuted ? (
                      <button
                        onClick={() => unmuteMut.mutate()}
                        disabled={unmuteMut.isPending}
                        className="text-xs px-2.5 py-1 rounded-md border border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-700"
                      >
                        Unmute
                      </button>
                    ) : (
                      <>
                        <select
                          value={muteHours}
                          onChange={(e) => setMuteHours(Number(e.target.value))}
                          className="text-xs border border-gray-200 rounded-md px-1.5 py-1"
                        >
                          {MUTE_PRESETS.map((p) => (
                            <option key={p.hours} value={p.hours}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <input
                          value={muteReason}
                          onChange={(e) => setMuteReason(e.target.value)}
                          placeholder="reason (optional)"
                          maxLength={255}
                          className="hidden sm:block text-xs border border-gray-200 rounded-md px-2 py-1 w-36"
                        />
                        <button
                          onClick={() => muteMut.mutate()}
                          disabled={muteMut.isPending}
                          title="Block this user from sending messages for the selected period"
                          className="text-xs px-2.5 py-1 rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                          Mute
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[45vh]">
                {thread.messages.map((m) => (
                  <MessageBubble key={m.id} m={m} mine={m.sender_id === me?.id} />
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-gray-100 p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (body.trim() && !reply.isPending) reply.mutate(body.trim());
                  }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder={`Reply to ${thread.username}… (text only)`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    type="submit"
                    disabled={!body.trim() || reply.isPending}
                    className="shrink-0 bg-violet-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-800 disabled:opacity-50"
                  >
                    {reply.isPending ? "Sending…" : "Send"}
                  </button>
                </form>
                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 m-auto p-8">Thread not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
