import Link from "next/link";
import { EventFeed } from "@/components/EventFeed";
import { PageShell } from "@/components/PageShell";
import { loadUpcomingEvents } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { venueAccentClass } from "@/lib/venueStyle";
import type { EventSummary } from "@/lib/types/database";

type Props = {
  params: Promise<{ venue: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { venue } = await params;
  const name = decodeURIComponent(venue);
  return { title: `${name} · Venue` };
}

export default async function VenuePage({ params }: Props) {
  const { venue: raw } = await params;
  const venue = decodeURIComponent(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { events, error } = await loadUpcomingEvents(user?.id);
  const atVenue = events.filter(
    (e) => e.venue.toLowerCase() === venue.toLowerCase(),
  ) as EventSummary[];
  const city = atVenue[0]?.city;
  const accent = venueAccentClass(venue);

  return (
    <PageShell>
      <div className="space-y-6">
        <header className="space-y-3">
          <Link
            href="/explore"
            className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
          >
            ← Feed
          </Link>
          <div className={`rounded-lg p-6 ${accent}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Venue
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white">{venue}</h1>
            {city ? (
              <p className="mt-2 text-sm text-white/80">
                <Link
                  href={`/cities/${encodeURIComponent(city)}`}
                  className="underline-offset-2 hover:underline"
                >
                  {city}
                </Link>
              </p>
            ) : null}
          </div>
          <p className="text-sm text-zinc-400">
            Upcoming rock and metal shows at this venue.
          </p>
        </header>

        {error ? (
          <p className="text-sm text-amber-200">{error}</p>
        ) : atVenue.length === 0 ? (
          <p className="text-sm text-zinc-500">No upcoming shows listed here.</p>
        ) : (
          <EventFeed
            events={atVenue}
            currentUserId={user?.id ?? null}
          />
        )}
      </div>
    </PageShell>
  );
}
