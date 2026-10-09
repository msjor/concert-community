"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChannelChat } from "@/components/ChannelChat";
import { FormattedTime } from "@/components/FormattedTime";
import { createClient } from "@/lib/supabase/client";
import type {
  BoardCategory,
  BoardSide,
  BoardStatus,
  EventBoardPostWithProfile,
  EventPostWithProfile,
} from "@/lib/types/database";

const CATEGORIES: { id: BoardCategory; label: string }[] = [
  { id: "company", label: "Company" },
  { id: "ride", label: "Ride" },
  { id: "ticket", label: "Ticket" },
  { id: "merch", label: "Merch" },
  { id: "other", label: "Other" },
];

const STATUS_LABEL: Record<BoardStatus, string> = {
  open: "Open",
  claimed: "Claimed",
  closed: "Closed",
};

type SelfProfile = {
  username: string | null;
  avatar_url: string | null;
};

type Props = {
  eventId: string;
  userId: string | null;
  posts: EventBoardPostWithProfile[];
  replies: EventPostWithProfile[];
  selfProfile?: SelfProfile | null;
};

function sideLabel(side: BoardSide) {
  return side === "offer" ? "Offering" : "Looking for";
}

export function LookingForBoard({
  eventId,
  userId,
  posts,
  replies,
  selfProfile = null,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("thread");
  const [items, setItems] = useState(posts);

  useEffect(() => {
    setItems(posts);
  }, [posts]);
  const [composing, setComposing] = useState(false);
  const [side, setSide] = useState<BoardSide>("want");
  const [category, setCategory] = useState<BoardCategory>("company");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const replyCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const reply of replies) {
      if (!reply.thread_id) continue;
      counts.set(reply.thread_id, (counts.get(reply.thread_id) ?? 0) + 1);
    }
    return counts;
  }, [replies]);

  const ordered = useMemo(() => {
    const rank: Record<BoardStatus, number> = { open: 0, claimed: 1, closed: 2 };
    return [...items].sort((a, b) => {
      const byStatus = rank[a.status] - rank[b.status];
      if (byStatus !== 0) return byStatus;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items]);

  const selected = ordered.find((post) => post.id === selectedId) ?? null;
  const threadReplies = replies.filter((reply) => reply.thread_id === selected?.id);

  function openThread(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("channel", "looking-for");
    if (id) params.set("thread", id);
    else params.delete("thread");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !title.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("event_board_posts")
      .insert({
        event_id: eventId,
        user_id: userId,
        side,
        category,
        title: title.trim(),
        details: details.trim() || null,
      })
      .select(
        "id, event_id, user_id, side, category, status, title, details, created_at, updated_at, profiles(id, username, avatar_url)",
      )
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not pin that.");
      setSaving(false);
      return;
    }

    const raw = data as unknown as EventBoardPostWithProfile & {
      profiles:
        | EventBoardPostWithProfile["profiles"]
        | NonNullable<EventBoardPostWithProfile["profiles"]>[]
        | null;
    };
    const joined = Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles;
    const created: EventBoardPostWithProfile = {
      ...raw,
      profiles:
        joined ??
        (selfProfile
          ? {
              id: userId,
              username: selfProfile.username,
              avatar_url: selfProfile.avatar_url,
            }
          : null),
    };
    setItems((prev) => [created, ...prev]);
    setTitle("");
    setDetails("");
    setComposing(false);
    setSaving(false);
    openThread(created.id);
    router.refresh();
  }

  async function setStatus(id: string, status: BoardStatus) {
    if (!userId) return;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("event_board_posts")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setItems((prev) => prev.map((post) => (post.id === id ? { ...post, status } : post)));
  }

  async function removePost(id: string) {
    if (!userId) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("event_board_posts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setItems((prev) => prev.filter((post) => post.id !== id));
    openThread(null);
  }

  const list = (
    <div className="flex min-h-0 w-full flex-1 flex-col lg:w-80 lg:flex-none lg:border-r lg:border-zinc-800 lg:pr-3">
      <div className="flex shrink-0 items-center justify-between gap-2 pb-3">
        <p className="text-sm text-zinc-400">
          <span className="font-medium text-zinc-100">Pinned</span>
          {" · "}
          open requests stay up top
        </p>
        {userId ? (
          <button
            type="button"
            onClick={() => setComposing((v) => !v)}
            className="min-h-9 shrink-0 rounded-md bg-crimson px-3 text-xs font-medium text-white"
          >
            {composing ? "Close" : "New"}
          </button>
        ) : null}
      </div>

      {composing && userId ? (
        <form onSubmit={createPost} className="mb-3 shrink-0 space-y-2 rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="flex gap-2">
            {(
              [
                ["want", "Looking for"],
                ["offer", "Offering"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSide(value)}
                className={`min-h-9 flex-1 rounded-md px-2 text-xs font-medium ${
                  side === value
                    ? "bg-crimson text-white"
                    : "border border-zinc-700 text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  category === item.id
                    ? "bg-zinc-100 text-zinc-950"
                    : "border border-zinc-700 text-zinc-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Looking for company in the pit"
            required
            className="min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
          />
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            placeholder="Optional detail — where you’re coming from, how many seats…"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
          />
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="min-h-10 rounded-md bg-crimson px-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Pinning…" : "Pin it"}
          </button>
        </form>
      ) : null}

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {ordered.length === 0 ? (
          <li className="text-sm text-zinc-500">
            Nothing pinned yet. Post that you’re looking for company, a ride, or a ticket.
          </li>
        ) : (
          ordered.map((post) => {
            const active = post.id === selected?.id;
            const count = replyCount.get(post.id) ?? 0;
            const name = post.profiles?.username ?? "Fan";
            return (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() => openThread(post.id)}
                  className={`w-full rounded-md border px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson ${
                    active
                      ? "border-crimson bg-zinc-900"
                      : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-600"
                  } ${post.status === "closed" ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide">
                    <span className="text-crimson">
                      {sideLabel(post.side)} · {post.category}
                    </span>
                    {post.status === "open" ? (
                      <span className="text-zinc-500">Pinned</span>
                    ) : (
                      <span className="text-zinc-500">{STATUS_LABEL[post.status]}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{post.title}</p>
                  {post.details ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{post.details}</p>
                  ) : null}
                  <p className="mt-1.5 text-[11px] text-zinc-500">
                    {name}
                    {" · "}
                    {count} {count === 1 ? "reply" : "replies"}
                  </p>
                </button>
              </li>
            );
          })
        )}
      </ul>
      {!userId ? (
        <p className="shrink-0 pt-3 text-sm text-zinc-400">
          <Link href="/login" className="text-crimson underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}
          to pin a request.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="shrink-0 pt-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );

  const thread = selected ? (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-4">
      <div className="shrink-0 border-b border-zinc-800 pb-3">
        <button
          type="button"
          onClick={() => openThread(null)}
          className="mb-2 text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline lg:hidden"
        >
          ← All requests
        </button>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-crimson">
              {sideLabel(selected.side)} · {selected.category} · {STATUS_LABEL[selected.status]}
            </p>
            <h2 className="mt-1 text-base font-semibold text-zinc-50">{selected.title}</h2>
            {selected.details ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{selected.details}</p>
            ) : null}
            <p className="mt-1 text-xs text-zinc-500">
              {selected.profiles?.username ?? "Fan"} ·{" "}
              <FormattedTime iso={selected.created_at} />
            </p>
          </div>
          {userId === selected.user_id ? (
            <div className="flex flex-wrap gap-1.5">
              {selected.status !== "open" ? (
                <button
                  type="button"
                  onClick={() => void setStatus(selected.id, "open")}
                  className="min-h-8 rounded-md border border-zinc-700 px-2 text-xs text-zinc-300"
                >
                  Reopen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void setStatus(selected.id, "claimed")}
                  className="min-h-8 rounded-md border border-zinc-700 px-2 text-xs text-zinc-300"
                >
                  Mark claimed
                </button>
              )}
              {selected.status !== "closed" ? (
                <button
                  type="button"
                  onClick={() => void setStatus(selected.id, "closed")}
                  className="min-h-8 rounded-md border border-zinc-700 px-2 text-xs text-zinc-300"
                >
                  Close
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void removePost(selected.id)}
                className="min-h-8 rounded-md px-2 text-xs text-zinc-500 hover:text-red-400"
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <ChannelChat
        eventId={eventId}
        userId={userId}
        channel="general"
        threadId={selected.id}
        channelLabel={selected.title}
        placeholder="Reply in this thread…"
        initialPosts={threadReplies}
        selfProfile={selfProfile}
        showHeader={false}
        className="pt-3"
      />
    </div>
  ) : (
    <div className="hidden min-h-0 flex-1 items-center justify-center px-6 text-center lg:flex">
      <p className="max-w-xs text-sm text-zinc-500">
        Pick a pinned request. Replies stay in that thread, so the board doesn’t scroll away.
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div
        className={
          selected
            ? "hidden lg:flex lg:h-full lg:min-h-0 lg:w-80 lg:shrink-0"
            : "flex min-h-0 flex-1 flex-col lg:w-80 lg:flex-none"
        }
      >
        {list}
      </div>
      {selected ? (
        thread
      ) : (
        <div className="hidden min-h-0 flex-1 lg:flex">{thread}</div>
      )}
    </div>
  );
}
