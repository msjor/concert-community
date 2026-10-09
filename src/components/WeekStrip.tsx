import Link from "next/link";
import type { EventSummary } from "@/lib/types/database";

/** Compact 7-day strip with dots for days that have shows. */
export function WeekStrip({ events }: { events: EventSummary[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const count = events.filter((e) => e.date.slice(0, 10) === key).length;
    return { d, key, count, isToday: i === 0 };
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          This week
        </p>
        <Link
          href="/calendar"
          className="text-xs text-crimson underline-offset-2 hover:underline"
        >
          Full calendar
        </Link>
      </div>
      <ul className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map(({ d, key, count, isToday }) => (
          <li key={key} className="min-w-0 flex-1">
            <Link
              href="/calendar"
              className={`flex flex-col items-center rounded-md border px-1 py-2 transition-colors ${
                count > 0
                  ? "border-crimson/40 bg-crimson/10 text-zinc-100"
                  : "border-zinc-800 text-zinc-500"
              } ${isToday ? "ring-1 ring-crimson/50" : ""}`}
            >
              <span className="text-[10px] uppercase">
                {d.toLocaleDateString("en-GB", { weekday: "short" })}
              </span>
              <span className="text-sm font-semibold">{d.getDate()}</span>
              <span
                className={`mt-1 h-1.5 w-1.5 rounded-full ${
                  count > 0 ? "bg-crimson" : "bg-transparent"
                }`}
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
