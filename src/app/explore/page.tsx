import Link from "next/link";
import { CityContextBar } from "@/components/CityContextBar";
import { SceneFeed, type FeedAuthor } from "@/components/ExploreDoomFeed";
import { PageShell } from "@/components/PageShell";
import { resolveDiscoveryCity } from "@/lib/discovery";
import {
  buildExploreFeedPool,
  pageFeed,
  type SceneShow,
} from "@/lib/exploreFeed";
import { citiesFromEvents, loadUpcomingEvents } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Feed",
};

export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let author: FeedAuthor | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    author = {
      id: user.id,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    };
  }

  const { events } = await loadUpcomingEvents();
  const cities = citiesFromEvents(events);
  const { city, source } = await resolveDiscoveryCity(cities);
  const feed = await buildExploreFeedPool({ city });
  const { page, nextCursor, hasMore } = pageFeed(feed.items, 0, 8);
  const shows: SceneShow[] = events
    .filter((event) => event.city.toLowerCase() === city.toLowerCase())
    .map((event) => ({
      id: event.id,
      band_name: event.band_name,
      venue: event.venue,
      city: event.city,
      date: event.date,
      image_url: event.image_url ?? null,
      genre: event.genre,
    }));

  return (
    <PageShell>
      <div className="space-y-4">
        <header className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
                Feed
              </h1>
              <p className="text-sm text-zinc-400">
                Open requests near {city} — company, rides, tickets.
              </p>
            </div>
            <Link
              href="/calendar"
              className="shrink-0 text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
              Calendar
            </Link>
          </div>
          {cities.length > 0 ? (
            <CityContextBar cities={cities} currentCity={city} source={source} />
          ) : null}
        </header>

        {feed.error ? (
          <div className="rounded-md border border-amber-800/60 bg-amber-950/40 p-4 text-sm text-amber-200">
            <p className="font-medium">Could not load the feed</p>
            <p className="mt-1 text-amber-200/80">{feed.error}</p>
          </div>
        ) : (
          <SceneFeed
            initialItems={page}
            initialCursor={nextCursor}
            initialHasMore={hasMore}
            city={city}
            shows={shows}
            author={author}
          />
        )}
      </div>
    </PageShell>
  );
}
