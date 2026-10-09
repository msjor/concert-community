import Link from "next/link";
import { FollowUserButton } from "@/components/FollowUserButton";
import { PageShell } from "@/components/PageShell";
import { ProfileFace } from "@/components/ProfileFace";
import { ProfileShows, type ProfileShow } from "@/components/ProfileShows";
import { resolveBandImage } from "@/lib/bandImages";
import { createClient } from "@/lib/supabase/server";
import type { EventSummary, Profile } from "@/lib/types/database";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  return { title: decodeURIComponent(username) };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, username, avatar_url, favorite_genres, favorite_bands, bio, city, usually_goes_alone, open_to_meet, can_drive",
    )
    .eq("username", username)
    .maybeSingle();

  if (profileError && /open_to_meet|can_drive/i.test(profileError.message)) {
    const fallback = await supabase
      .from("profiles")
      .select(
        "id, username, avatar_url, favorite_genres, favorite_bands, bio, city, usually_goes_alone",
      )
      .eq("username", username)
      .maybeSingle();
    profileData = fallback.data
      ? { ...fallback.data, open_to_meet: false, can_drive: false }
      : null;
  }

  if (!profileData) {
    return (
      <PageShell>
        <h1 className="text-xl font-semibold text-zinc-50">User not found</h1>
        <Link href="/people" className="mt-4 inline-block text-sm text-crimson hover:underline">
          Back to People
        </Link>
      </PageShell>
    );
  }

  const profile = profileData as Profile;

  const { data: attendance } = await supabase
    .from("attendees")
    .select(
      "id, event_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, ride_seats, hide_name, events(id, title, band_name, venue, city, date, genre, price_range, image_url)",
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const visible = (attendance ?? []).filter(
    (row) => !(row as { hide_name?: boolean }).hide_name,
  );

  const shows: ProfileShow[] = visible.flatMap((row) => {
    const raw = row as {
      id: string;
      status: string;
      going_alone?: boolean;
      looking_for_company?: boolean;
      looking_for_ride?: boolean;
      offering_ride?: boolean;
      ride_seats?: number | null;
      events: EventSummary | EventSummary[] | null;
    };
    const ev = raw.events;
    const event = Array.isArray(ev) ? ev[0] : ev;
    if (!event) return [];
    const badges = [raw.status];
    if (raw.looking_for_company) badges.push("wants company");
    if (raw.going_alone) badges.push("alone");
    if (raw.looking_for_ride) badges.push("needs a ride");
    if (raw.offering_ride) badges.push("offering a ride");
    return [
      {
        id: raw.id,
        event: {
          ...event,
          image_url: resolveBandImage(event.band_name, event.image_url),
        },
        badges,
      },
    ];
  });

  let initiallyFollowing = false;
  if (user) {
    const { data: follow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    initiallyFollowing = Boolean(follow);
  }

  const { count: followerCount } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", profile.id);

  return (
    <PageShell>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <div className="flex items-start justify-between gap-4">
          <ProfileFace profile={profile} followerCount={followerCount ?? 0} />
          <FollowUserButton
            targetUserId={profile.id}
            currentUserId={user?.id ?? null}
            initiallyFollowing={initiallyFollowing}
          />
        </div>

        <ProfileShows items={shows} empty="No public shows yet." />
      </div>
    </PageShell>
  );
}
