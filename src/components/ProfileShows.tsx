import Link from "next/link";
import { BandImage } from "@/components/BandImage";
import { FormattedTime } from "@/components/FormattedTime";
import type { EventSummary } from "@/lib/types/database";

export type ProfileShow = {
  id: string;
  event: EventSummary;
  badges: string[];
};

export function ProfileShows({
  items,
  empty,
}: {
  items: ProfileShow[];
  empty?: string;
}) {
  const now = Date.now() - 6 * 60 * 60 * 1000;
  const upcoming = items
    .filter((item) => new Date(item.event.date).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.event.date).getTime() - new Date(b.event.date).getTime(),
    );
  const past = items
    .filter((item) => new Date(item.event.date).getTime() < now)
    .sort(
      (a, b) =>
        new Date(b.event.date).getTime() - new Date(a.event.date).getTime(),
    );

  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        {empty ?? (
          <>
            No shows yet.{" "}
            <Link href="/" className="text-crimson underline-offset-2 hover:underline">
              Browse shows
            </Link>
          </>
        )}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <ShowGroup title="Upcoming" items={upcoming} empty="Nothing coming up." />
      {past.length > 0 ? <ShowGroup title="Past" items={past} /> : null}
    </div>
  );
}

function ShowGroup({
  title,
  items,
  empty,
}: {
  title: string;
  items: ProfileShow[];
  empty?: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-50">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/events/${item.event.id}`}
                className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 hover:border-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
              >
                <BandImage
                  bandName={item.event.band_name}
                  imageUrl={item.event.image_url}
                  venue={item.event.venue}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-md"
                  sizes="64px"
                  letterClassName="text-lg font-black uppercase text-white/90"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zinc-50">
                    {item.event.band_name}
                  </p>
                  <p className="truncate text-sm text-zinc-400">
                    {item.event.venue} · {item.event.city}
                  </p>
                  <FormattedTime
                    iso={item.event.date}
                    variant="date"
                    className="mt-0.5 block text-xs text-zinc-500"
                  />
                  {item.badges.length > 0 ? (
                    <p className="mt-2 flex flex-wrap gap-1">
                      {item.badges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded border border-zinc-700 px-1.5 py-0.5 text-[11px] capitalize text-zinc-300"
                        >
                          {badge}
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
