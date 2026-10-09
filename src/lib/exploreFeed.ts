import { createClient } from "@/lib/supabase/server";
import { resolveBandImage } from "@/lib/bandImages";
import type { BoardCategory, BoardSide, EventSummary } from "@/lib/types/database";

export type SceneShow = {
  id: string;
  band_name: string;
  venue: string;
  city: string;
  date: string;
  image_url: string | null;
  genre: string;
};

/** One open looking-for (or offering) post, with the show as context. */
export type LookingPost = {
  id: string;
  sortAt: string;
  username: string | null;
  avatarUrl: string | null;
  userId: string;
  side: BoardSide;
  category: BoardCategory;
  title: string;
  details: string | null;
  href: string;
  event: SceneShow;
};

type ProfileBit = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

function profileOf(
  raw: ProfileBit | ProfileBit[] | null | undefined,
): ProfileBit | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function showOf(ev: EventSummary): SceneShow {
  return {
    id: ev.id,
    band_name: ev.band_name,
    venue: ev.venue,
    city: ev.city,
    date: ev.date,
    image_url: ev.image_url ?? null,
    genre: ev.genre,
  };
}

function sameCity(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

export async function buildExploreFeedPool(options?: {
  city?: string | null;
}): Promise<{
  items: LookingPost[];
  error: string | null;
}> {
  const supabase = await createClient();
  const cityFilter = options?.city?.trim() || null;

  const { data: eventRows, error: eventError } = await supabase
    .from("events")
    .select(
      "id, title, band_name, venue, city, date, genre, price_range, image_url",
    )
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true })
    .limit(80);

  if (eventError) {
    return { items: [], error: eventError.message };
  }

  let events: EventSummary[] = ((eventRows ?? []) as EventSummary[]).map(
    (e) => ({
      ...e,
      image_url: resolveBandImage(e.band_name, e.image_url),
    }),
  );
  if (cityFilter) {
    events = events.filter((e) => sameCity(e.city, cityFilter));
  }
  const eventById = new Map(events.map((e) => [e.id, e]));
  const eventIds = events.map((e) => e.id);
  if (eventIds.length === 0) {
    return { items: [], error: null };
  }

  const { data: board, error: boardError } = await supabase
    .from("event_board_posts")
    .select(
      "id, event_id, user_id, side, category, status, title, details, created_at, profiles(id, username, avatar_url)",
    )
    .in("event_id", eventIds)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(60);

  if (boardError) {
    return { items: [], error: boardError.message };
  }

  const items: LookingPost[] = [];
  for (const row of board ?? []) {
    const ev = eventById.get(row.event_id);
    if (!ev) continue;
    const profile = profileOf(
      row.profiles as ProfileBit | ProfileBit[] | null,
    );
    items.push({
      id: row.id,
      sortAt: row.created_at,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      userId: row.user_id,
      side: row.side,
      category: row.category,
      title: row.title,
      details: row.details,
      href: `/events/${ev.id}?channel=looking-for&thread=${row.id}`,
      event: showOf(ev),
    });
  }

  return { items, error: null };
}

export function pageFeed(
  items: LookingPost[],
  cursor: number,
  limit: number,
): { page: LookingPost[]; nextCursor: number; hasMore: boolean } {
  if (items.length === 0) {
    return { page: [], nextCursor: 0, hasMore: false };
  }
  const page = items.slice(cursor, cursor + limit);
  const nextCursor = cursor + page.length;
  return {
    page,
    nextCursor,
    hasMore: nextCursor < items.length,
  };
}
