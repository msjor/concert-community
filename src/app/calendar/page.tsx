import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { loadUpcomingEvents } from "@/lib/events";
import type { EventSummary } from "@/lib/types/database";

export const metadata = {
  title: "Calendar",
};

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dayOfMonth(iso: string) {
  return new Date(iso).getUTCDate();
}

export default async function CalendarPage() {
  const { events, error } = await loadUpcomingEvents();

  const byMonth = new Map<string, EventSummary[]>();
  for (const e of events) {
    const key = monthKey(e.date);
    const list = byMonth.get(key) ?? [];
    list.push(e);
    byMonth.set(key, list);
  }

  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <PageShell>
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-50">Calendar</h1>
          <p className="text-sm text-zinc-400">
            Upcoming CZ rock/metal shows by month.
          </p>
        </header>

        {error ? (
          <p className="text-sm text-amber-200">{error}</p>
        ) : months.length === 0 ? (
          <p className="text-sm text-zinc-500">No upcoming shows.</p>
        ) : (
          <div className="grid items-start gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
          {months.map(([key, list]) => (
            <section key={key} className="space-y-3">
              <h2 className="text-lg font-semibold text-zinc-100">
                {monthLabel(key)}
              </h2>
              <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
                {list.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/events/${e.id}`}
                      className="flex gap-3 px-3 py-3 hover:bg-zinc-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-900 font-mono text-sm text-crimson">
                        {dayOfMonth(e.date)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-zinc-50">
                          {e.band_name}
                        </span>
                        <span className="block truncate text-sm text-zinc-500">
                          {e.venue} · {e.city} · {e.genre}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
