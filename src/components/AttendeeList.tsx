"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { AttendeeWithProfile } from "@/lib/types/database";

type Filter = "all" | "open";

type Props = {
  attendees: AttendeeWithProfile[];
  followingIds?: string[];
};

export function AttendeeList({
  attendees,
  followingIds = [],
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const following = useMemo(() => new Set(followingIds), [followingIds]);

  const sorted = useMemo(() => {
    const score = (a: AttendeeWithProfile) => {
      let s = 0;
      if (a.status === "going") s += 4;
      if (a.looking_for_company || a.going_alone) s += 2;
      if (following.has(a.user_id)) s += 1;
      return s;
    };
    return [...attendees].sort((a, b) => score(b) - score(a));
  }, [attendees, following]);

  const filtered = useMemo(() => {
    if (filter === "open") {
      return sorted.filter((a) => a.looking_for_company || a.going_alone);
    }
    return sorted;
  }, [sorted, filter]);

  const openCount = attendees.filter(
    (a) => a.looking_for_company || a.going_alone,
  ).length;

  if (attendees.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No one has RSVP&apos;d yet. Be the first.</p>
    );
  }

  return (
    <div className="@container space-y-4">
      {openCount > 0 ? (
        <button
          type="button"
          aria-pressed={filter === "open"}
          aria-label="Open to meet"
          onClick={() => setFilter((current) => (current === "open" ? "all" : "open"))}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson ${
            filter === "open"
              ? "border-crimson text-crimson"
              : "border-zinc-700 text-zinc-400"
          }`}
        >
          <MeetIcon />
          {filter === "open" ? (
            <span className="text-xs font-medium">Open to meet</span>
          ) : null}
        </button>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">No one matches this filter yet.</p>
      ) : (
        <ul className="grid gap-3 @min-[28rem]:grid-cols-2 @min-[48rem]:grid-cols-3" aria-label="Attendees">
          {filtered.map((a) => {
            const name = a.hide_name
              ? "Anonymous fan"
              : (a.profiles?.username ?? "Fan");
            const isFollowed = following.has(a.user_id) && !a.hide_name;
            const marks: { key: string; label: string; icon: ReactNode }[] = [];
            if (isFollowed) marks.push({ key: "following", label: "Following", icon: <StarIcon /> });
            if (a.status === "interested") {
              marks.push({ key: "interested", label: "Interested", icon: <BookmarkIcon /> });
            }
            if (a.looking_for_company || a.going_alone) {
              marks.push({ key: "meet", label: "Open to meet", icon: <MeetIcon /> });
            }
            if (a.has_tickets) marks.push({ key: "tickets", label: "Has tickets", icon: <TicketIcon /> });
            if (a.looking_for_ride) {
              marks.push({ key: "need", label: "Needs a ride", icon: <CarIcon /> });
            }
            if (a.offering_ride) {
              marks.push({
                key: "offer",
                label:
                  a.ride_seats != null
                    ? `Offering a ride, ${a.ride_seats} seats`
                    : "Offering a ride",
                icon: <CarIcon />,
              });
            }

            return (
              <li
                key={a.id}
                className={`flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-sm ${
                  isFollowed ? "ring-1 ring-zinc-600" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {a.profiles?.avatar_url && !a.hide_name ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.profiles.avatar_url}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-full bg-zinc-800 object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200"
                    >
                      {name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <span className="block truncate text-zinc-100">{name}</span>
                    {a.profiles?.city && !a.hide_name ? (
                      <span className="text-xs text-zinc-500">{a.profiles.city}</span>
                    ) : null}
                    {a.ride_from ? (
                      <span className="block text-xs text-zinc-500">
                        From {a.ride_from}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-zinc-400">
                  {marks.map((mark) => (
                    <span key={mark.key} title={mark.label} aria-label={mark.label} className="text-zinc-300">
                      {mark.icon}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MeetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <circle cx="9" cy="9" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="16" cy="10" r="1.75" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4.5 18c.7-2.2 2.4-3.4 4.5-3.4s3.8 1.2 4.5 3.4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M14 14.8c1.2-.5 2.4-.6 3.6-.2 1.3.6 2.1 1.7 2.5 3.4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path d="M4 8.5h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4v-3Z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path d="M4 15.5 5.5 10h13L20 15.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M4 15.5h16V18H4v-2.5Z" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="8" cy="17.5" r="1" fill="currentColor" />
      <circle cx="16" cy="17.5" r="1" fill="currentColor" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path d="M8 5h8a1 1 0 0 1 1 1v13l-5-2.6L7 19V6a1 1 0 0 1 1-1Z" fill="currentColor" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-crimson" aria-hidden>
      <path d="m12 4 1.8 4.2L18.5 9l-3.2 2.8.9 4.7L12 14.8 7.8 16.5l.9-4.7L5.5 9l4.7-.8L12 4Z" fill="currentColor" />
    </svg>
  );
}
