import { createClient } from "@/lib/supabase/server";
import { resolveBandImage } from "@/lib/bandImages";
import type { EventSummary } from "@/lib/types/database";

const EVENT_SUMMARY_SELECT =
  "id, title, band_name, venue, city, date, genre, price_range, image_url";

export async function loadUpcomingEvents(userId?: string | null): Promise<{
  events: EventSummary[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SUMMARY_SELECT)
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true });

  if (error) {
    // Older DBs without image_url — retry without the column
    if (error.message.toLowerCase().includes("image_url")) {
      const fallback = await supabase
        .from("events")
        .select(
          "id, title, band_name, venue, city, date, genre, price_range",
        )
        .gte("date", new Date().toISOString())
        .order("date", { ascending: true });
      if (fallback.error) {
        return { events: [], error: fallback.error.message };
      }
      const events = ((fallback.data ?? []) as EventSummary[]).map((e) => ({
        ...e,
        image_url: resolveBandImage(e.band_name),
      }));
      return { events: await attachSocialCounts(events, userId), error: null };
    }
    return { events: [], error: error.message };
  }

  const events = ((data ?? []) as EventSummary[]).map((e) => ({
    ...e,
    image_url: resolveBandImage(e.band_name, e.image_url),
  }));
  return { events: await attachSocialCounts(events, userId), error: null };
}

type Face = { avatar_url: string | null; username: string | null };

type AttendeeRow = {
  event_id: string;
  status: string;
  user_id?: string;
  going_alone?: boolean;
  looking_for_company?: boolean;
  profiles?: Face | Face[] | null;
};

function faceFrom(row: AttendeeRow): Face | null {
  const profile = row.profiles;
  if (!profile) return null;
  return Array.isArray(profile) ? (profile[0] ?? null) : profile;
}

export async function attachSocialCounts(
  events: EventSummary[],
  userId?: string | null,
): Promise<EventSummary[]> {
  if (events.length === 0) return events;
  const supabase = await createClient();
  const ids = events.map((e) => e.id);

  const joined = await supabase
    .from("attendees")
    .select(
      "event_id, status, user_id, going_alone, looking_for_company, profiles(avatar_url, username)",
    )
    .in("event_id", ids);

  const attendeesResult = joined.error
    ? await supabase
        .from("attendees")
        .select("event_id, status, user_id, going_alone, looking_for_company")
        .in("event_id", ids)
    : joined;

  const { data: chats } = await supabase
    .from("event_posts")
    .select("event_id")
    .in("event_id", ids);

  const attendees = (attendeesResult.data ?? []) as AttendeeRow[];
  const going = new Map<string, number>();
  const alone = new Map<string, number>();
  const faces = new Map<string, Face[]>();
  const mine = new Map<string, EventSummary["my_status"]>();
  const chat = new Map<string, number>();
  for (const row of attendees) {
    if (userId && row.user_id === userId) {
      if (row.status === "going" || row.status === "interested") {
        mine.set(row.event_id, row.status);
      }
    }
    if (row.status === "going") {
      going.set(row.event_id, (going.get(row.event_id) ?? 0) + 1);
      if (row.looking_for_company || row.going_alone) {
        alone.set(row.event_id, (alone.get(row.event_id) ?? 0) + 1);
      }
      const bucket = faces.get(row.event_id) ?? [];
      if (bucket.length < 3) {
        const face = faceFrom(row);
        bucket.push(
          face ?? { avatar_url: null, username: null },
        );
        faces.set(row.event_id, bucket);
      }
    }
  }
  for (const row of chats ?? []) {
    chat.set(row.event_id, (chat.get(row.event_id) ?? 0) + 1);
  }

  return events.map((e) => ({
    ...e,
    going_count: going.get(e.id) ?? 0,
    alone_count: alone.get(e.id) ?? 0,
    chat_count: chat.get(e.id) ?? 0,
    going_faces: faces.get(e.id) ?? [],
    my_status: mine.get(e.id) ?? null,
  }));
}

export function citiesFromEvents(events: EventSummary[]) {
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.city, (counts.get(e.city) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([city]) => city);
}
