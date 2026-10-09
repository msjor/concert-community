"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BandImage } from "@/components/BandImage";
import { FormattedTime } from "@/components/FormattedTime";
import { createClient } from "@/lib/supabase/client";
import type { AttendeeStatus, EventSummary } from "@/lib/types/database";

type Props = {
  event: EventSummary;
  variant?: "list" | "tile";
  currentUserId?: string | null;
};

function FaceStack({
  event,
}: {
  event: EventSummary;
}) {
  const count = event.going_count ?? 0;
  if (count <= 0) return null;
  const faces = event.going_faces ?? [];
  return (
    <span className="flex items-center" aria-label={`${count} going`}>
      <span className="flex -space-x-2">
        {(faces.length > 0 ? faces : [null]).slice(0, 3).map((face, index) =>
          face?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${face.username ?? "fan"}-${index}`}
              src={face.avatar_url}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 rounded-full bg-zinc-800 object-cover ring-2 ring-zinc-950"
            />
          ) : (
            <span
              key={index}
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-semibold text-zinc-200 ring-2 ring-zinc-950"
            >
              {(face?.username ?? "?").slice(0, 1).toUpperCase()}
            </span>
          ),
        )}
      </span>
      <span className="ml-2 text-xs tabular-nums text-zinc-400">{count}</span>
    </span>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function utcStamp(iso: string) {
  const date = new Date(iso);
  return {
    day: String(date.getUTCDate()),
    month: MONTHS[date.getUTCMonth()] ?? "",
  };
}

function DateStamp({ iso }: { iso: string }) {
  const [stamp, setStamp] = useState(() => utcStamp(iso));

  useEffect(() => {
    const date = new Date(iso);
    setStamp({
      day: String(date.getDate()),
      month: date.toLocaleDateString("en-GB", { month: "short" }),
    });
  }, [iso]);

  return (
    <span className="flex min-w-10 flex-col items-center rounded-md bg-zinc-950/90 px-1.5 py-1 leading-none">
      <span
        className="text-base font-bold tabular-nums text-zinc-50"
        suppressHydrationWarning
      >
        {stamp.day}
      </span>
      <span
        className="text-[10px] font-medium uppercase tracking-wide text-zinc-400"
        suppressHydrationWarning
      >
        {stamp.month}
      </span>
    </span>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EventCard({
  event,
  variant = "list",
  currentUserId = null,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mine, setMine] = useState<AttendeeStatus | null>(event.my_status ?? null);

  async function markInterested(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    if (mine === "going") return;
    const supabase = createClient();
    if (mine === "interested") {
      const { error } = await supabase
        .from("attendees")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", currentUserId);
      if (error) return;
      setMine(null);
    } else {
      const { error } = await supabase.from("attendees").upsert(
        {
          event_id: event.id,
          user_id: currentUserId,
          status: "interested",
        },
        { onConflict: "event_id,user_id" },
      );
      if (error) return;
      setMine("interested");
    }
    startTransition(() => router.refresh());
  }

  const saveLabel =
    mine === "going" ? "Going" : mine === "interested" ? "Interested" : "Interested";

  const saveButton = (
    <button
      type="button"
      disabled={pending || mine === "going"}
      onClick={(e) => void markInterested(e)}
      aria-label={saveLabel}
      aria-pressed={mine != null}
      className={`inline-flex min-h-10 items-center gap-1 rounded-full bg-zinc-950/80 px-2.5 text-zinc-100 backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson disabled:opacity-80 ${
        mine ? "text-crimson" : "hover:text-crimson"
      }`}
    >
      <BookmarkIcon filled={mine != null} />
      {mine ? <span className="pr-1 text-xs font-medium">{saveLabel}</span> : null}
    </button>
  );

  if (variant === "tile") {
    return (
      <article className="relative">
        <Link
          href={`/events/${event.id}`}
          className="block overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
        >
          <BandImage
            bandName={event.band_name}
            imageUrl={event.image_url}
            venue={event.venue}
            className="aspect-square w-full rounded-lg"
            sizes="192px"
          />
          <div className="space-y-0.5 pt-2">
            <h2 className="truncate text-sm font-semibold text-zinc-50">
              {event.band_name}
            </h2>
            <p className="truncate text-xs text-zinc-500">{event.venue}</p>
            <FaceStack event={event} />
          </div>
        </Link>
        <div className="absolute left-2 top-2 z-10">
          <DateStamp iso={event.date} />
        </div>
        <div className="absolute right-2 top-2 z-10">{saveButton}</div>
      </article>
    );
  }

  return (
    <article className="relative flex gap-3 py-3">
      <Link
        href={`/events/${event.id}`}
        className="flex min-w-0 flex-1 gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
      >
        <BandImage
          bandName={event.band_name}
          imageUrl={event.image_url}
          venue={event.venue}
          className="h-24 w-16 shrink-0 overflow-hidden rounded-md"
          sizes="64px"
          letterClassName="text-lg font-black uppercase text-white/90"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="truncate text-base font-semibold text-zinc-50">
            {event.band_name}
          </h2>
          <FormattedTime iso={event.date} className="block text-sm text-zinc-300" />
          <p className="truncate text-sm text-zinc-500">
            {event.venue} · {event.city}
          </p>
          <FaceStack event={event} />
        </div>
      </Link>
      <div className="shrink-0 self-start">{saveButton}</div>
    </article>
  );
}
