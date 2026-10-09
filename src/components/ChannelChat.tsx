"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FormattedTime } from "@/components/FormattedTime";
import type { ChatChannel, EventPostWithProfile } from "@/lib/types/database";

type SelfProfile = {
  username: string | null;
  avatar_url: string | null;
};

type Props = {
  eventId: string;
  userId: string | null;
  channel: ChatChannel;
  channelLabel: string;
  placeholder: string;
  initialPosts: EventPostWithProfile[];
  /** When set, this pane is one looking-for thread. */
  threadId?: string | null;
  selfProfile?: SelfProfile | null;
  quickPrompts?: string[];
  headerExtra?: ReactNode;
  /** Hide the small channel label (thread view supplies its own header). */
  showHeader?: boolean;
  className?: string;
};

function belongs(
  post: { channel?: ChatChannel; thread_id?: string | null },
  channel: ChatChannel,
  threadId: string | null,
) {
  if (threadId) return post.thread_id === threadId;
  return post.channel === channel && !post.thread_id;
}

function groupPosts(posts: EventPostWithProfile[]) {
  const groups: {
    key: string;
    userId: string;
    name: string;
    avatar: string | null;
    posts: EventPostWithProfile[];
  }[] = [];

  for (const post of posts) {
    const last = groups[groups.length - 1];
    const prev = last?.posts[last.posts.length - 1];
    const gap = prev
      ? new Date(post.created_at).getTime() - new Date(prev.created_at).getTime()
      : Infinity;
    if (last && last.userId === post.user_id && gap < 5 * 60 * 1000) {
      last.posts.push(post);
    } else {
      groups.push({
        key: post.id,
        userId: post.user_id,
        name: post.profiles?.username ?? "Fan",
        avatar: post.profiles?.avatar_url ?? null,
        posts: [post],
      });
    }
  }
  return groups;
}

export function ChannelChat({
  eventId,
  userId,
  channel,
  channelLabel,
  placeholder,
  initialPosts,
  threadId = null,
  selfProfile = null,
  quickPrompts,
  headerExtra,
  showHeader = true,
  className = "",
}: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const visible = posts.filter((post) => belongs(post, channel, threadId));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [visible.length]);

  useEffect(() => {
    const supabase = createClient();
    const topic = `chat:${eventId}:${channel}:${threadId ?? "root"}:${crypto.randomUUID()}`;
    const realtime = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_posts",
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          const row = payload.new as EventPostWithProfile;
          if (!belongs(row, channel, threadId)) return;

          setPosts((prev) => {
            if (prev.some((p) => p.id === row.id)) return prev;
            return [...prev, { ...row, profiles: row.profiles ?? null }];
          });

          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .eq("id", row.user_id)
            .maybeSingle();

          if (profile) {
            setPosts((prev) =>
              prev.map((p) => (p.id === row.id ? { ...p, profiles: profile } : p)),
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(realtime);
    };
  }, [eventId, channel, threadId]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!userId || !text || sending) return;

      setSending(true);
      setError(null);
      const supabase = createClient();
      const optimisticId = `temp-${crypto.randomUUID()}`;
      const optimistic: EventPostWithProfile = {
        id: optimisticId,
        event_id: eventId,
        user_id: userId,
        channel,
        thread_id: threadId,
        content: text,
        created_at: new Date().toISOString(),
        profiles: selfProfile
          ? {
              id: userId,
              username: selfProfile.username,
              avatar_url: selfProfile.avatar_url,
            }
          : null,
      };

      setPosts((prev) => [...prev, optimistic]);
      setContent("");

      const inserted = threadId
        ? await supabase
            .from("event_posts")
            .insert({
              event_id: eventId,
              user_id: userId,
              channel,
              thread_id: threadId,
              content: optimistic.content,
            })
            .select("id, event_id, user_id, channel, thread_id, content, created_at")
            .single()
        : await supabase
            .from("event_posts")
            .insert({
              event_id: eventId,
              user_id: userId,
              channel,
              content: optimistic.content,
            })
            .select("id, event_id, user_id, channel, content, created_at")
            .single();
      const data = inserted.data as unknown as EventPostWithProfile | null;
      const insertError = inserted.error;

      if (insertError || !data) {
        setPosts((prev) => prev.filter((p) => p.id !== optimisticId));
        setContent(optimistic.content);
        setError(
          insertError?.message?.includes("thread_id")
            ? "Threads need migration 010. Run it in the Supabase SQL editor, then try again."
            : (insertError?.message ?? "Could not post."),
        );
        setSending(false);
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === optimisticId
            ? { ...data, profiles: p.profiles }
            : p,
        ),
      );
      setSending(false);
    },
    [channel, eventId, selfProfile, sending, threadId, userId],
  );

  const groups = groupPosts(visible);

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      {showHeader ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pb-2">
          <p className="text-sm text-zinc-400">
            <span className="font-medium text-zinc-200">{channelLabel}</span>
          </p>
          {headerExtra}
        </div>
      ) : null}

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2"
      >
        {groups.length === 0 ? (
          <p className="px-1 py-6 text-sm text-zinc-500">
            {threadId
              ? "No replies yet. Say you can help, or ask a detail."
              : "No messages yet. Say where you’re coming from, or who’s in the pit."}
          </p>
        ) : (
          groups.map((group) => {
            const mine = group.userId === userId;
            const profileHref =
              group.name !== "Fan" ? `/u/${encodeURIComponent(group.name)}` : null;
            return (
              <div key={group.key} className="flex gap-3 px-1">
                {group.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={group.avatar}
                    alt=""
                    width={36}
                    height={36}
                    className="mt-0.5 h-9 w-9 shrink-0 rounded-full bg-zinc-800 object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200"
                  >
                    {group.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    {profileHref ? (
                      <Link
                        href={profileHref}
                        className={`text-sm font-semibold hover:underline ${
                          mine ? "text-crimson" : "text-zinc-100"
                        }`}
                      >
                        {group.name}
                      </Link>
                    ) : (
                      <span
                        className={`text-sm font-semibold ${
                          mine ? "text-crimson" : "text-zinc-100"
                        }`}
                      >
                        {group.name}
                      </span>
                    )}
                    <FormattedTime
                      iso={group.posts[0].created_at}
                      variant="time"
                      className="text-[11px] text-zinc-500"
                    />
                  </div>
                  {group.posts.map((post) => (
                    <p
                      key={post.id}
                      className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200"
                    >
                      {post.content}
                    </p>
                  ))}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {userId ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(content);
          }}
          className="shrink-0 space-y-2 border-t border-zinc-800 pt-3"
        >
          {quickPrompts && quickPrompts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setContent(prompt)}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:border-crimson hover:text-crimson"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
          <label htmlFor={`chat-${channel}-${threadId ?? "root"}`} className="sr-only">
            Message
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id={`chat-${channel}-${threadId ?? "root"}`}
              rows={1}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(content);
                }
              }}
              placeholder={placeholder}
              className="max-h-32 min-h-11 w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
            />
            <button
              type="submit"
              disabled={sending || !content.trim()}
              className="min-h-11 shrink-0 rounded-md bg-crimson px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson disabled:opacity-60"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
          <p className="text-[11px] text-zinc-600">Enter to send · Shift+Enter for a new line</p>
          {error ? (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="shrink-0 border-t border-zinc-800 pt-3 text-sm text-zinc-400">
          <Link href="/login" className="text-crimson underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}
          to chat.
        </p>
      )}
    </div>
  );
}
