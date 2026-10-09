import { FindBoard } from "@/components/FindBoard";
import { PageShell } from "@/components/PageShell";
import { resolveDiscoveryCity } from "@/lib/discovery";
import { citiesFromEvents, loadUpcomingEvents } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { events, error } = await loadUpcomingEvents(user?.id);
  const cities = citiesFromEvents(events);
  const { city, source } = await resolveDiscoveryCity(cities);
  const preferred = new Set<string>();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("favorite_genres, favorite_bands")
      .eq("id", user.id)
      .maybeSingle();

    const profileGenres: string[] = profile?.favorite_genres ?? [];
    const profileBands = (profile?.favorite_bands ?? []).map((b: string) =>
      b.toLowerCase(),
    );

    const [{ data: follows }, { data: bandFollows }] = await Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
      supabase.from("band_follows").select("band_name").eq("user_id", user.id),
    ]);

    const followingIds = new Set((follows ?? []).map((f) => f.following_id));
    const followedBands = new Set(
      (bandFollows ?? []).map((b) => b.band_name.toLowerCase()),
    );

    const sceneIds = new Set<string>();
    if (followingIds.size > 0) {
      const { data: sceneAttendees } = await supabase
        .from("attendees")
        .select("event_id")
        .in("user_id", [...followingIds])
        .gte(
          "created_at",
          new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
        );
      for (const row of sceneAttendees ?? []) sceneIds.add(row.event_id);
    }

    for (const event of events) {
      const genreHit = profileGenres.some(
        (genre: string) => genre.toLowerCase() === event.genre.toLowerCase(),
      );
      const bandHit =
        profileBands.includes(event.band_name.toLowerCase()) ||
        followedBands.has(event.band_name.toLowerCase());
      if (genreHit || bandHit || sceneIds.has(event.id)) preferred.add(event.id);
    }
  }

  return (
    <PageShell>
      {error ? (
        <p className="text-sm text-amber-200">{error}</p>
      ) : (
        <FindBoard
          city={city}
          cities={cities}
          source={source}
          events={events}
          preferredIds={[...preferred]}
          currentUserId={user?.id ?? null}
        />
      )}
    </PageShell>
  );
}
