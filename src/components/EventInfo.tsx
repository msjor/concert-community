import Link from "next/link";
import { FormattedTime } from "@/components/FormattedTime";
import type { Event } from "@/lib/types/database";

export function EventInfo({ event }: { event: Event }) {
  const support = event.support_acts?.filter(Boolean) ?? [];

  return (
    <section className="space-y-3" aria-labelledby="info-heading">
      <h2 id="info-heading" className="text-lg font-semibold text-zinc-50">
        Show info
      </h2>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-zinc-500">When</dt>
          <dd className="text-zinc-200">
            <FormattedTime iso={event.date} variant="long" />
            {event.doors_at ? (
              <span className="block text-zinc-400">
                Doors <FormattedTime iso={event.doors_at} variant="time" /> · Start{" "}
                <FormattedTime iso={event.date} variant="time" />
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Where</dt>
          <dd className="text-zinc-200">
            <Link
              href={`/cities/${encodeURIComponent(event.city)}`}
              className="text-crimson underline-offset-2 hover:underline"
            >
              {event.city}
            </Link>
            <span className="block">{event.venue}</span>
            {event.venue_address ? (
              <span className="block text-zinc-400">{event.venue_address}</span>
            ) : null}
            {event.map_url ? (
              <a
                href={event.map_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-crimson underline-offset-2 hover:underline"
              >
                Open map
              </a>
            ) : null}
          </dd>
        </div>
        {support.length > 0 ? (
          <div>
            <dt className="text-zinc-500">Support</dt>
            <dd className="text-zinc-200">{support.join(" · ")}</dd>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {event.price_range ? (
            <div>
              <dt className="text-zinc-500">Tickets</dt>
              <dd className="text-zinc-200">{event.price_range}</dd>
            </div>
          ) : null}
          {event.age_restriction ? (
            <div>
              <dt className="text-zinc-500">Age</dt>
              <dd className="text-zinc-200">{event.age_restriction}</dd>
            </div>
          ) : null}
        </div>
        {event.ticket_url ? (
          <div>
            <a
              href={event.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-md bg-crimson px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
            >
              Get tickets
            </a>
          </div>
        ) : null}
        {event.transit_notes ? (
          <div>
            <dt className="text-zinc-500">Getting there</dt>
            <dd className="text-zinc-300">{event.transit_notes}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
