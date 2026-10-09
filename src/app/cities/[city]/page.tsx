import Link from "next/link";
import { CityContextBar } from "@/components/CityContextBar";
import { EventFeed } from "@/components/EventFeed";
import { PageShell } from "@/components/PageShell";
import { resolveDiscoveryCity } from "@/lib/discovery";
import { citiesFromEvents, loadUpcomingEvents } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import type { EventSummary } from "@/lib/types/database";

type Props = {
  params: Promise<{ city: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { city } = await params;
  const name = decodeURIComponent(city);
  return { title: `${name} shows` };
}

export default async function CityPage({ params }: Props) {
  const { city: raw } = await params;
  const city = decodeURIComponent(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { events, error } = await loadUpcomingEvents(user?.id);
  const cities = citiesFromEvents(events);
  const inCity = events.filter(
    (e) => e.city.toLowerCase() === city.toLowerCase(),
  ) as EventSummary[];
  const { source } = await resolveDiscoveryCity(cities);

  return (
    <PageShell>
      <div className="space-y-6">
        <header className="space-y-2">
          <Link
            href="/"
            className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
          >
            ← Find
          </Link>
          <h1 className="text-2xl font-bold text-zinc-50">{city}</h1>
          <p className="text-sm text-zinc-400">
            Upcoming rock and metal in {city}. See who’s going and jump into the show thread.
          </p>
        </header>

        {cities.length > 0 ? (
          <CityContextBar cities={cities} currentCity={city} source={source} />
        ) : null}

        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <EventFeed
            events={inCity}
            initialCity={city}
            currentUserId={user?.id ?? null}
            hideCityFilter
          />
        )}
      </div>
    </PageShell>
  );
}
