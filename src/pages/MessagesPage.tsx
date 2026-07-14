import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, messages, type Message } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useSeo } from "../hooks/useSeo";

function when(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ m, mine }: { m: Message; mine: boolean }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          mine
            ? "bg-violet-600 text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        }`}
      >
        {!mine && (
          <p className="text-[11px] font-semibold mb-0.5 text-violet-700">
            {m.sender_name}
            {m.from_admin && <span className="ml-1 font-normal text-gray-400">· admin</span>}
          </p>
        )}
        {/* Plain text only — bodies are never rendered as HTML/markdown. */}
        <p className="whitespace-pre-wrap break-words">{m.body}</p>
        <p className={`text-[10px] mt-1 ${mine ? "text-violet-200" : "text-gray-400"}`}>
          {when(m.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useSeo({ title: "Messages" });

  const { data: thread, isLoading } = useQuery({
    queryKey: ["my-messages"],
    queryFn: messages.myThread,
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const send = useMutation({
    mutationFn: (text: string) => messages.send(text),
    onSuccess: () => {
      setBody("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["my-messages"] });
      qc.invalidateQueries({ queryKey: ["my-unread"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not send the message."),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
        Sign in to message the admins.
      </div>
    );
  }

  const muted = thread?.muted_until ? new Date(thread.muted_until) : null;
  const isMuted = !!muted && muted.getTime() > Date.now();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Messages</h1>
      <p className="text-sm text-gray-500 mb-6">
        A private thread between you and the KalpaDB admins. Replies usually take a day or two.
      </p>

      <div className="border border-gray-200 rounded-xl bg-white">
        <div className="max-h-[55vh] overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <p className="text-center text-sm text-gray-400 py-8">Loading…</p>
          ) : thread && thread.messages.length > 0 ? (
            <>
              {thread.messages.map((m) => (
                <MessageBubble key={m.id} m={m} mine={m.sender_id === user.id} />
              ))}
              <div ref={bottomRef} />
            </>
          ) : (
            <p className="text-center text-sm text-gray-400 py-8">
              No messages yet. Questions about the catalogue, corrections, or contributing —
              write to the admins below.
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 p-3">
          {isMuted ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              An admin has paused your ability to send messages until{" "}
              <strong>{when(thread!.muted_until!)}</strong>. You can still read replies here.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (body.trim() && !send.isPending) send.mutate(body.trim());
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Write a message to the admins… (text only)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="submit"
                disabled={!body.trim() || send.isPending}
                className="shrink-0 bg-violet-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-800 disabled:opacity-50 transition-colors"
              >
                {send.isPending ? "Sending…" : "Send"}
              </button>
            </form>
          )}
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
