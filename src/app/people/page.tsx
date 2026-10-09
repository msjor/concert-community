import Link from "next/link";
import { CityContextBar } from "@/components/CityContextBar";
import { PageShell } from "@/components/PageShell";
import { PersonCard } from "@/components/PersonCard";
import { resolveDiscoveryCity } from "@/lib/discovery";
import { citiesFromEvents, loadUpcomingEvents } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import type { PublicProfileCard } from "@/lib/types/database";

export const metadata = {
  title: "People",
};

function genreOverlap(a: string[] | null | undefined, b: string[] | null | undefined) {
  const set = new Set((a ?? []).map((g) => g.toLowerCase()));
  return (b ?? []).filter((g) => set.has(g.toLowerCase())).length;
}

export default async function PeoplePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { events } = await loadUpcomingEvents();
  const cities = citiesFromEvents(events);
  const { city, source } = await resolveDiscoveryCity(cities);

  let myGenres: string[] = [];
  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("favorite_genres")
      .eq("id", user.id)
      .maybeSingle();
    myGenres = me?.favorite_genres ?? [];
  }

  const { data: peopleData } = await supabase
    .from("profiles")
    .select(
      "id, username, avatar_url, city, bio, favorite_genres, favorite_bands, usually_goes_alone",
    )
    .not("username", "is", null)
    .order("username", { ascending: true })
    .limit(60);

  let followingIds = new Set<string>();
  if (user) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    followingIds = new Set((follows ?? []).map((f) => f.following_id));
  }

  const people = ((peopleData ?? []) as PublicProfileCard[])
    .filter((p) => p.id !== user?.id)
    .map((p) => ({
      ...p,
      overlap_score:
        (p.city === city ? 3 : 0) +
        genreOverlap(myGenres, p.favorite_genres) * 2 +
        (p.usually_goes_alone ? 1 : 0),
    }))
    .sort((a, b) => (b.overlap_score ?? 0) - (a.overlap_score ?? 0));

  const near = people.filter((p) => p.city === city);
  const alone = people.filter((p) => p.usually_goes_alone);
  const taste = people.filter(
    (p) => genreOverlap(myGenres, p.favorite_genres) > 0,
  );

  return (
    <PageShell>
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-50">People</h1>
          <p className="text-sm text-zinc-400">
            Find fans near you, solo pit regulars, and overlapping taste — then follow
            them into your scene feed.
          </p>
        </header>

        {cities.length > 0 ? (
          <CityContextBar cities={cities} currentCity={city} source={source} />
        ) : null}

        {!user ? (
          <p className="text-sm text-zinc-400">
            <Link href="/login?next=/people" className="text-crimson hover:underline">
              Sign in
            </Link>{" "}
            to follow people and personalize matches.
          </p>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-50">In {city}</h2>
          {near.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No public profiles in {city} yet. Set your city on your profile.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
              {near.map((p) => (
                <PersonCard
                  key={p.id}
                  profile={p}
                  currentUserId={user?.id ?? null}
                  initiallyFollowing={followingIds.has(p.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-50">Open to meet</h2>
          {alone.length === 0 ? (
            <p className="text-sm text-zinc-500">Nobody opted into this signal yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
              {alone.slice(0, 12).map((p) => (
                <PersonCard
                  key={p.id}
                  profile={p}
                  currentUserId={user?.id ?? null}
                  initiallyFollowing={followingIds.has(p.id)}
                />
              ))}
            </div>
          )}
        </section>

        {user && myGenres.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-50">Shared genres</h2>
            {taste.length === 0 ? (
              <p className="text-sm text-zinc-500">No overlaps yet — explore shows and follow fans.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
                {taste.slice(0, 12).map((p) => (
                  <PersonCard
                    key={p.id}
                    profile={p}
                    currentUserId={user.id}
                    initiallyFollowing={followingIds.has(p.id)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-50">Everyone</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
            {people.slice(0, 24).map((p) => (
              <PersonCard
                key={p.id}
                profile={p}
                currentUserId={user?.id ?? null}
                initiallyFollowing={followingIds.has(p.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
