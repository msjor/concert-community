import { PageShell } from "@/components/PageShell";
import { ProfileScreen } from "@/components/ProfileScreen";
import type { ProfileShow } from "@/components/ProfileShows";
import { resolveBandImage } from "@/lib/bandImages";
import { createClient } from "@/lib/supabase/server";
import type { AttendeeWithEvent, EventSummary, Profile } from "@/lib/types/database";

export const metadata = {
  title: "Profile",
};

const PROFILE_SELECT =
  "id, username, avatar_url, favorite_genres, favorite_bands, bio, city, usually_goes_alone, open_to_meet, can_drive";

function badgesFor(row: AttendeeWithEvent) {
  const badges: string[] = [row.status];
  if (row.looking_for_company) badges.push("wants company");
  if (row.going_alone) badges.push("alone");
  if (row.looking_for_ride) badges.push("needs a ride");
  if (row.offering_ride) {
    badges.push(
      row.ride_seats != null ? `offering a ride · ${row.ride_seats}` : "offering a ride",
    );
  }
  return badges;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  let { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError && /open_to_meet|can_drive/i.test(profileError.message)) {
    const fallback = await supabase
      .from("profiles")
      .select(
        "id, username, avatar_url, favorite_genres, favorite_bands, bio, city, usually_goes_alone",
      )
      .eq("id", user.id)
      .maybeSingle();
    profileData = fallback.data
      ? { ...fallback.data, open_to_meet: false, can_drive: false }
      : null;
  }

  const profile: Profile = {
    id: user.id,
    username: profileData?.username ?? null,
    avatar_url: profileData?.avatar_url ?? null,
    favorite_genres: profileData?.favorite_genres ?? [],
    favorite_bands: profileData?.favorite_bands ?? [],
    bio: profileData?.bio ?? null,
    city: profileData?.city ?? null,
    usually_goes_alone: profileData?.usually_goes_alone ?? false,
    open_to_meet: profileData?.open_to_meet ?? false,
    can_drive: profileData?.can_drive ?? false,
  };

  const { data: attendance } = await supabase
    .from("attendees")
    .select(
      "id, event_id, user_id, status, looking_for_ride, looking_for_company, has_tickets, offering_ride, ride_from, ride_seats, going_alone, hide_name, events(id, title, band_name, venue, city, date, genre, price_range, image_url)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const saved = (attendance ?? []) as unknown as AttendeeWithEvent[];
  const shows: ProfileShow[] = saved.flatMap((row) => {
    const event = row.events;
    if (!event) return [];
    const summary: EventSummary = {
      ...event,
      image_url: resolveBandImage(event.band_name, event.image_url),
    };
    return [{ id: row.id, event: summary, badges: badgesFor(row) }];
  });

  return (
    <PageShell>
      <ProfileScreen profile={profile} email={user.email ?? null} shows={shows} />
    </PageShell>
  );
}
