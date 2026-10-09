"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EventSummary } from "@/lib/types/database";
import { EventCard } from "@/components/EventCard";
import { EventFilters } from "@/components/EventFilters";
import { useLocale } from "@/components/LocaleProvider";

export function EventFeed({
  events,
  initialCity = "",
  currentUserId = null,
  hideCityFilter = false,
}: {
  events: EventSummary[];
  initialCity?: string;
  currentUserId?: string | null;
  /** When city is already chosen via CityContextBar */
  hideCityFilter?: boolean;
}) {
  const { t } = useLocale();
  const [city, setCity] = useState(hideCityFilter ? "" : initialCity);
  const [genre, setGenre] = useState("");
  const [aloneOnly, setAloneOnly] = useState(false);
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("focus") === "1") {
      searchRef.current?.focus();
    }
  }, []);

  const cities = useMemo(
    () => [...new Set(events.map((e) => e.city))].sort(),
    [events],
  );
  const genres = useMemo(
    () => [...new Set(events.map((e) => e.genre))].sort(),
    [events],
  );

  const filtered = events.filter((e) => {
    if (city && e.city !== city) return false;
    if (genre && e.genre !== genre) return false;
    if (aloneOnly && !(e.alone_count && e.alone_count > 0)) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      const hay =
        `${e.band_name} ${e.title} ${e.venue} ${e.city} ${e.genre}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <label className="block space-y-1 text-sm text-zinc-400">
        {t.search}
        <input
          ref={searchRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
        />
      </label>

      <EventFilters
        cities={hideCityFilter ? [] : cities}
        genres={genres}
        city={city}
        genre={genre}
        aloneOnly={aloneOnly}
        onCityChange={setCity}
        onGenreChange={setGenre}
        onAloneOnlyChange={setAloneOnly}
        hideCity={hideCityFilter}
      />
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          No upcoming shows match these filters.
        </p>
      ) : (
        <ul className="grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((event) => (
            <li key={event.id} className="border-b border-zinc-800/80">
              <EventCard event={event} currentUserId={currentUserId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
