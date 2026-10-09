"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { EventCard } from "@/components/EventCard";
import { useSoftCityPromptActive } from "@/components/SoftCityPrompt";
import type { EventSummary } from "@/lib/types/database";

type WindowId = "all" | "week" | "month";

const WINDOWS: { id: WindowId; label: string; days: number | null }[] = [
  { id: "all", label: "All dates", days: null },
  { id: "week", label: "This week", days: 7 },
  { id: "month", label: "This month", days: 31 },
];

type Props = {
  city: string;
  cities: string[];
  source?: "profile" | "cookie" | "default";
  events: EventSummary[];
  preferredIds: string[];
  currentUserId: string | null;
};

export function FindBoard({
  city,
  cities,
  events,
  preferredIds,
  currentUserId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const softCityActive = useSoftCityPromptActive();
  const [windowId, setWindowId] = useState<WindowId>("all");
  const [genre, setGenre] = useState("");
  const [query, setQuery] = useState("");
  const preferred = useMemo(() => new Set(preferredIds), [preferredIds]);

  const genres = useMemo(
    () =>
      [...new Set(events.filter((event) => event.city === city).map((event) => event.genre))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [city, events],
  );

  useEffect(() => {
    if (genre && !genres.includes(genre)) setGenre("");
  }, [genre, genres]);

  function onCityChange(next: string) {
    startTransition(async () => {
      await fetch("/api/city", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: next }),
      });
      router.refresh();
      if (pathname.startsWith("/cities/")) {
        router.push(`/cities/${encodeURIComponent(next)}`);
      }
    });
  }

  const local = useMemo(() => {
    const days = WINDOWS.find((item) => item.id === windowId)?.days ?? null;
    const limit = days == null ? Infinity : Date.now() + days * 24 * 60 * 60 * 1000;
    const needle = query.trim().toLowerCase();
    return events
      .filter((event) => {
        if (event.city !== city) return false;
        if (new Date(event.date).getTime() > limit) return false;
        if (genre && event.genre !== genre) return false;
        if (needle) {
          const hay = `${event.band_name} ${event.title} ${event.venue} ${event.genre}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [city, events, genre, query, windowId]);

  const rows = useMemo(() => {
    const forYou = local.filter((event) => preferred.has(event.id)).slice(0, 12);
    const used = new Set(forYou.map((event) => event.id));
    const popular = [...local]
      .filter((event) => !used.has(event.id) && (event.going_count ?? 0) > 0)
      .sort((a, b) => (b.going_count ?? 0) - (a.going_count ?? 0))
      .slice(0, 12);
    for (const event of popular) used.add(event.id);
    const upcoming = local.filter((event) => !used.has(event.id));
    return [
      { id: "you", title: "For you", items: forYou },
      { id: "popular", title: "Popular", items: popular },
      { id: "upcoming", title: "Coming up", items: upcoming },
    ].filter((row) => row.items.length > 0);
  }, [local, preferred]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative block xl:max-w-xl xl:flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bands, venues, and shows"
            aria-label="Search bands, venues, and shows"
            className="h-12 w-full rounded-full border border-zinc-700 bg-zinc-900 pl-11 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {softCityActive || cities.length === 0 ? null : (
            <PillSelect
              ariaLabel="City"
              value={city}
              disabled={pending}
              onChange={onCityChange}
              icon={<PinIcon />}
              options={cities.map((item) => ({ value: item, label: item }))}
            />
          )}
          <PillSelect
            ariaLabel="When"
            value={windowId}
            onChange={(value) => setWindowId(value as WindowId)}
            icon={<CalendarIcon />}
            options={WINDOWS.map((item) => ({ value: item.id, label: item.label }))}
          />
          <PillSelect
            ariaLabel="Genre"
            value={genre}
            onChange={setGenre}
            options={[
              { value: "", label: "All genres" },
              ...genres.map((item) => ({ value: item, label: item })),
            ]}
          />
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No shows in {city}
          {windowId === "week" ? " this week" : windowId === "month" ? " this month" : ""}
          {genre ? ` · ${genre}` : ""}
          {query.trim() ? ` for “${query.trim()}”` : ""}.
        </p>
      ) : (
        rows.map((row) => (
          <ShowRow
            key={row.id}
            title={row.title}
            items={row.items}
            currentUserId={currentUserId}
          />
        ))
      )}
    </div>
  );
}

function PillSelect({
  ariaLabel,
  value,
  options,
  onChange,
  icon,
  disabled = false,
}: {
  ariaLabel: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const label = options.find((item) => item.value === value)?.label ?? value;
  return (
    <label
      className={`relative inline-flex h-11 items-center gap-2 rounded-full border border-zinc-600 px-4 text-sm font-medium text-zinc-100 focus-within:outline focus-within:outline-2 focus-within:outline-crimson ${
        disabled ? "opacity-60" : "hover:border-zinc-400"
      }`}
    >
      {icon}
      <span>{label}</span>
      <ChevronIcon />
      <select
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-wait"
      >
        {options.map((item) => (
          <option key={item.value || "all"} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-300" aria-hidden>
      <path
        d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="11" r="1.75" fill="currentColor" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-300" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3.5v3M16 3.5v3M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-400" aria-hidden>
      <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShowRow({
  title,
  items,
  currentUserId,
}: {
  title: string;
  items: EventSummary[];
  currentUserId: string | null;
}) {
  const scroller = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  function measure() {
    const el = scroller.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [items]);

  function move(direction: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.max(el.clientWidth * 0.85, 220),
      behavior: "smooth",
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-50">{title}</h2>
      <div className="relative">
        <ul
          ref={scroller}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        >
          {items.map((event) => (
            <li key={event.id} className="w-40 shrink-0 snap-start sm:w-48">
              <EventCard
                event={event}
                variant="tile"
                currentUserId={currentUserId}
              />
            </li>
          ))}
        </ul>
        {edges.start ? null : (
          <RowArrow label={`Previous ${title}`} direction={-1} onClick={() => move(-1)} />
        )}
        {edges.end ? null : (
          <RowArrow label={`Next ${title}`} direction={1} onClick={() => move(1)} />
        )}
      </div>
    </section>
  );
}

function RowArrow({
  label,
  direction,
  onClick,
}: {
  label: string;
  direction: -1 | 1;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-20 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-zinc-100 hover:border-zinc-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson sm:top-24 lg:flex ${
        direction < 0 ? "left-1" : "right-1"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          d={direction < 0 ? "M14.5 6.5 9 12l5.5 5.5" : "M9.5 6.5 15 12l-5.5 5.5"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
