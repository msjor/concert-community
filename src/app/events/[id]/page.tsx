import { Suspense } from "react";
import Link from "next/link";
import { EventServerLayout } from "@/components/EventServerLayout";
import { resolveBandImage } from "@/lib/bandImages";
import { createClient } from "@/lib/supabase/server";
import type {
  Attendee,
  AttendeeWithProfile,
  Event,
  EventBoardPostWithProfile,
  EventPinWithProfile,
  EventPostWithProfile,
} from "@/lib/types/database";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ channel?: string }>;
};

const EVENT_SELECT =
  "id, title, band_name, venue, city, date, genre, doors_at, venue_address, ticket_url, price_range, age_restriction, support_acts, transit_notes, map_url, image_url";

const ATTENDEE_SELECT =
  "id, event_id, user_id, status, looking_for_ride, looking_for_company, has_tickets, offering_ride, ride_from, ride_seats, going_alone, hide_name, profiles(id, username, avatar_url, city, usually_goes_alone)";

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("band_name, title")
    .eq("id", id)
    .maybeSingle();

  return {
    title: data ? `${data.band_name} — ${data.title}` : "Event",
  };
}

export default async function EventDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { channel: initialChannel } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: eventData, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  let rawEvent = eventData as Event | null;
  if (error && error.message.toLowerCase().includes("image_url")) {
    const fallback = await supabase
      .from("events")
      .select(
        "id, title, band_name, venue, city, date, genre, doors_at, venue_address, ticket_url, price_range, age_restriction, support_acts, transit_notes, map_url",
      )
      .eq("id", id)
      .maybeSingle();
    rawEvent = fallback.data as Event | null;
  }

  if (!rawEvent) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold text-zinc-50">Event not found</h1>
        <Link href="/" className="mt-4 inline-block text-sm text-crimson underline-offset-2 hover:underline">
          Back to shows
        </Link>
      </div>
    );
  }

  const event: Event = {
    ...rawEvent,
    image_url: resolveBandImage(rawEvent.band_name, rawEvent.image_url),
  };

  const postsQuery = supabase
    .from("event_posts")
    .select(
      "id, event_id, user_id, channel, thread_id, content, created_at, profiles(id, username, avatar_url)",
    )
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  const [
    { data: attendeesData },
    postsResult,
    { data: boardData },
    { data: pinsData },
    { data: myRsvpData },
    selfResult,
  ] = await Promise.all([
    supabase
      .from("attendees")
      .select(ATTENDEE_SELECT)
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
    postsQuery,
    supabase
      .from("event_board_posts")
      .select(
        "id, event_id, user_id, side, category, status, title, details, created_at, updated_at, profiles(id, username, avatar_url)",
      )
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("event_pins")
      .select(
        "id, event_id, user_id, content, created_at, profiles(id, username, avatar_url)",
      )
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
    user
      ? supabase
          .from("attendees")
          .select(
            "id, event_id, user_id, status, looking_for_ride, looking_for_company, has_tickets, offering_ride, ride_from, ride_seats, going_alone, hide_name",
          )
          .eq("event_id", id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let postsData = postsResult.data as unknown as EventPostWithProfile[] | null;
  if (postsResult.error?.message.toLowerCase().includes("thread_id")) {
    const fallback = await supabase
      .from("event_posts")
      .select(
        "id, event_id, user_id, channel, content, created_at, profiles(id, username, avatar_url)",
      )
      .eq("event_id", id)
      .order("created_at", { ascending: true });
    postsData = ((fallback.data ?? []) as unknown as EventPostWithProfile[]).map(
      (post) => ({ ...post, thread_id: null }),
    );
  }

  const attendees = (attendeesData ?? []) as unknown as AttendeeWithProfile[];
  const allPosts = postsData ?? [];
  const chatPosts = allPosts.filter(
    (post) => post.channel === "general" && !post.thread_id,
  );
  const threadPosts = allPosts.filter((post) => Boolean(post.thread_id));
  const boardPosts = (boardData ?? []) as unknown as EventBoardPostWithProfile[];
  const selfProfile = selfResult.data
    ? {
        username: selfResult.data.username ?? null,
        avatar_url: selfResult.data.avatar_url ?? null,
      }
    : null;
  const pins = (pinsData ?? []) as unknown as EventPinWithProfile[];
  const myRsvp = (myRsvpData as Attendee | null) ?? null;
  const aloneCount = attendees.filter(
    (a) =>
      a.status === "going" && (a.going_alone || a.looking_for_company),
  ).length;

  let initiallyFollowingBand = false;
  let followingIds: string[] = [];
  if (user) {
    const [{ data: bandFollow }, { data: follows }] = await Promise.all([
      supabase
        .from("band_follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("band_name", event.band_name)
        .maybeSingle(),
      supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id),
    ]);
    initiallyFollowingBand = Boolean(bandFollow);
    followingIds = (follows ?? []).map((f) => f.following_id);
  }

  return (
    <Suspense fallback={<p className="p-6 text-sm text-zinc-500">Loading show…</p>}>
      <EventServerLayout
        event={event}
        userId={user?.id ?? null}
        myRsvp={myRsvp}
        attendees={attendees}
        chatPosts={chatPosts}
        boardPosts={boardPosts}
        threadPosts={threadPosts}
        selfProfile={selfProfile}
        pins={pins}
        aloneCount={aloneCount}
        initialChannel={initialChannel}
        followingIds={followingIds}
        initiallyFollowingBand={initiallyFollowingBand}
      />
    </Suspense>
  );
}
