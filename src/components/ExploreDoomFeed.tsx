"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormattedTime } from "@/components/FormattedTime";
import { createClient } from "@/lib/supabase/client";
import type { LookingPost, SceneShow } from "@/lib/exploreFeed";
import { resolveBandImage } from "@/lib/bandImages";
import type { BoardCategory, BoardSide } from "@/lib/types/database";

const CATEGORIES: { id: BoardCategory; label: string }[] = [
  { id: "company", label: "Company" },
  { id: "ride", label: "Ride" },
  { id: "ticket", label: "Ticket" },
  { id: "merch", label: "Merch" },
  { id: "other", label: "Other" },
];

export type FeedAuthor = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
};

type Props = {
  initialItems: LookingPost[];
  initialCursor: number;
  initialHasMore?: boolean;
  city?: string | null;
  shows: SceneShow[];
  author: FeedAuthor | null;
};

function badgeLabel(side: BoardSide, category: BoardCategory) {
  const label = CATEGORIES.find((item) => item.id === category)?.label ?? category;
  return side === "offer" ? `Offering · ${label}` : `Looking for · ${label}`;
}

function Avatar({
  url,
  name,
  size = 40,
}: {
  url: string | null;
  name: string | null;
  size?: number;
}) {
  const label = (name ?? "?").slice(0, 1).toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-full bg-zinc-800 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200"
      style={{ width: size, height: size }}
    >
      {label}
    </span>
  );
}

function PostCard({ item }: { item: LookingPost }) {
  const name = item.username ?? "Someone";
  const profileHref = item.username
    ? `/u/${encodeURIComponent(item.username)}`
    : null;
  const src = resolveBandImage(item.event.band_name, item.event.image_url);

  return (
    <article className="feed-card border-b border-zinc-800 py-4">
      <div className="flex gap-3 px-1">
        {profileHref ? (
          <Link href={profileHref} className="shrink-0">
            <Avatar url={item.avatarUrl} name={item.username} />
          </Link>
        ) : (
          <Avatar url={item.avatarUrl} name={item.username} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {profileHref ? (
              <Link
                href={profileHref}
                className="text-sm font-semibold text-zinc-100 hover:text-crimson"
              >
                {name}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-zinc-100">{name}</span>
            )}
            <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
              {badgeLabel(item.side, item.category)}
            </span>
            <FormattedTime
              iso={item.sortAt}
              className="text-[11px] text-zinc-600"
            />
          </div>

          <Link href={item.href} className="mt-2 block">
            <p className="text-sm font-medium leading-snug text-zinc-50">
              {item.title}
            </p>
            {item.details ? (
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                {item.details}
              </p>
            ) : null}

            <div className="mt-3 flex overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/80 transition-colors hover:border-zinc-600">
              <div className="relative h-[4.5rem] w-16 shrink-0">
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 px-3 py-2">
                <p className="truncate text-sm font-medium text-zinc-100">
                  {item.event.band_name}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {item.event.venue} · {item.event.city}
                </p>
                <FormattedTime
                  iso={item.event.date}
                  className="text-[11px] text-zinc-600"
                />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </article>
  );
}

function RequestComposer({
  shows,
  author,
  onCreated,
}: {
  shows: SceneShow[];
  author: FeedAuthor | null;
  onCreated: (post: LookingPost) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [eventId, setEventId] = useState(shows[0]?.id ?? "");
  const [side, setSide] = useState<BoardSide>("want");
  const [category, setCategory] = useState<BoardCategory>("company");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return shows;
    return shows.filter((show) =>
      `${show.band_name} ${show.venue} ${show.city}`
        .toLowerCase()
        .includes(needle),
    );
  }, [query, shows]);

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!filtered.some((show) => show.id === eventId)) {
      setEventId(filtered[0].id);
    }
  }, [filtered, eventId]);

  if (!author) {
    return (
      <p className="rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-3 text-sm text-zinc-400">
        <Link href="/login?next=/explore" className="text-crimson hover:underline">
          Sign in
        </Link>{" "}
        to post a looking-for.
      </p>
    );
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    if (!author || !title.trim() || !eventId) return;
    const show = shows.find((item) => item.id === eventId);
    if (!show) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("event_board_posts")
      .insert({
        event_id: eventId,
        user_id: author.id,
        side,
        category,
        title: title.trim(),
        details: details.trim() || null,
      })
      .select("id, created_at")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not post that.");
      setSaving(false);
      return;
    }

    const created: LookingPost = {
      id: data.id,
      sortAt: data.created_at,
      username: author.username,
      avatarUrl: author.avatarUrl,
      userId: author.id,
      side,
      category,
      title: title.trim(),
      details: details.trim() || null,
      href: `/events/${show.id}?channel=looking-for&thread=${data.id}`,
      event: show,
    };
    onCreated(created);
    setTitle("");
    setDetails("");
    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left"
      >
        <span className="text-sm text-zinc-300">
          Need company, a ride, or a ticket?
        </span>
        <span className="shrink-0 rounded-md bg-crimson px-3 py-1.5 text-xs font-medium text-white">
          {open ? "Close" : "New request"}
        </span>
      </button>

      {open ? (
        <form onSubmit={createPost} className="space-y-2 border-t border-zinc-800 p-3">
          {shows.length === 0 ? (
            <p className="text-sm text-zinc-500">No upcoming shows to attach this to.</p>
          ) : (
            <>
              <label className="block text-xs text-zinc-500" htmlFor="feed-show-filter">
                Show
              </label>
              <input
                id="feed-show-filter"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by band or venue"
                className="min-h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
              />
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                required
                className="min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
              >
                {filtered.map((show) => (
                  <option key={show.id} value={show.id}>
                    {show.band_name} · {show.venue}
                  </option>
                ))}
              </select>
              {filtered.length === 0 ? (
                <p className="text-xs text-zinc-500">No shows match that.</p>
              ) : null}
            </>
          )}

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
            placeholder={
              side === "offer"
                ? "Offering a ride from Brno"
                : "Looking for company in the pit"
            }
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
          {error ? <p className="text-sm text-amber-300">{error}</p> : null}
          <button
            type="submit"
            disabled={saving || !title.trim() || !eventId || filtered.length === 0}
            className="min-h-10 rounded-md bg-crimson px-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Posting…" : "Post"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function SceneFeed({
  initialItems,
  initialCursor,
  initialHasMore = true,
  city = null,
  shows,
  author,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const addPost = useCallback((post: LookingPost) => {
    setItems((prev) => [post, ...prev.filter((item) => item.id !== post.id)]);
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        cursor: String(cursor),
        limit: "8",
      });
      if (city) params.set("city", city);
      const res = await fetch(`/api/explore/feed?${params}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as {
        items?: LookingPost[];
        nextCursor?: number;
        hasMore?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Could not load more");
        return;
      }
      const next = body.items ?? [];
      setItems((prev) => {
        const have = new Set(prev.map((item) => item.id));
        return [...prev, ...next.filter((item) => !have.has(item.id))];
      });
      setCursor(body.nextCursor ?? cursor + next.length);
      setHasMore(Boolean(body.hasMore) && next.length > 0);
    } catch {
      setError("Network error — pull to try again");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [cursor, hasMore, city]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loadMore, hasMore]);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="order-1 lg:sticky lg:top-20 lg:order-2">
        <RequestComposer shows={shows} author={author} onCreated={addPost} />
      </div>

      <div className="order-2 lg:order-1">
      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">
          No open requests{city ? ` near ${city}` : ""} yet. Post one above, or
          check Find for shows.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <PostCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-8">
        {loading ? (
          <div className="flex w-full flex-col gap-3" aria-hidden>
            <div className="skeleton h-16 w-full rounded-md" />
            <div className="skeleton h-16 w-full rounded-md" />
          </div>
        ) : null}
        {error ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="text-sm text-crimson underline-offset-2 hover:underline"
          >
            {error} — Retry
          </button>
        ) : null}
      </div>
      </div>
    </div>
  );
}
