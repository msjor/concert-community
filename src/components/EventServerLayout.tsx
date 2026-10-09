"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BandImage } from "@/components/BandImage";
import { ChannelChat } from "@/components/ChannelChat";
import { ChannelInfo } from "@/components/ChannelInfo";
import { LookingForBoard } from "@/components/LookingForBoard";
import { AttendeeList } from "@/components/AttendeeList";
import { FollowBandButton } from "@/components/FollowBandButton";
import { FormattedTime } from "@/components/FormattedTime";
import { RsvpControls } from "@/components/RsvpControls";
import {
  resolveShowSurface,
  SHOW_SURFACES,
  type Attendee,
  type AttendeeWithProfile,
  type Event,
  type EventBoardPostWithProfile,
  type EventPinWithProfile,
  type EventPostWithProfile,
  type ShowSurface,
} from "@/lib/types/database";

const CHAT_PROMPTS = [
  "Looking for company",
  "Anyone for a pre-beer?",
  "Need a ride?",
  "Setlist guess?",
];

const TAB_SHORT: Record<ShowSurface, string> = {
  about: "About",
  going: "Going",
  chat: "Chat",
  looking: "Looking",
};

type Props = {
  event: Event;
  userId: string | null;
  myRsvp: Attendee | null;
  attendees: AttendeeWithProfile[];
  chatPosts: EventPostWithProfile[];
  boardPosts: EventBoardPostWithProfile[];
  threadPosts: EventPostWithProfile[];
  selfProfile?: { username: string | null; avatar_url: string | null } | null;
  pins: EventPinWithProfile[];
  aloneCount: number;
  initialChannel?: string | null;
  followingIds?: string[];
  initiallyFollowingBand?: boolean;
};

export function EventServerLayout({
  event,
  userId,
  myRsvp,
  attendees,
  chatPosts,
  boardPosts,
  threadPosts,
  selfProfile = null,
  pins,
  initialChannel,
  followingIds = [],
  initiallyFollowingBand = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasGoing = myRsvp?.status === "going";
  const channelParam = searchParams.get("channel") ?? initialChannel ?? null;
  const surface = resolveShowSurface(channelParam, hasGoing);

  function selectSurface(next: ShowSurface) {
    const spec = SHOW_SURFACES.find((item) => item.id === next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("channel", spec?.channelParam ?? next);
    if (next !== "looking") params.delete("thread");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function openBoardThread(postId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("channel", "looking-for");
    params.set("thread", postId);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const counts: Partial<Record<ShowSurface, number>> = {
    going: attendees.length,
    chat: chatPosts.length,
    looking: boardPosts.length,
  };

  const tabs = (orientation: "horizontal" | "vertical") => (
    <div
      role="tablist"
      aria-label="Show sections"
      className={orientation === "vertical" ? "flex flex-col gap-1" : "flex gap-1"}
    >
      {SHOW_SURFACES.map((tab) => {
        const vertical = orientation === "vertical";
        if (vertical && tab.id === "going") return null;
        const selected = vertical
          ? (surface === "going" ? tab.id === "about" : tab.id === surface)
          : tab.id === surface;
        const count = counts[tab.id] ?? 0;
        return (
          <button
            key={tab.id}
            id={vertical ? undefined : `tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            onClick={() => selectSurface(tab.id)}
            className={
              vertical
                ? `inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson ${
                    selected
                      ? "bg-zinc-800 font-medium text-zinc-50"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  }`
                : `channel-tab inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 px-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson ${
                    selected ? "font-medium text-zinc-50" : "text-zinc-500 hover:text-zinc-200"
                  }`
            }
          >
            <span>{vertical ? tab.label : TAB_SHORT[tab.id]}</span>
            {count > 0 ? (
              <span
                className={`tabular-nums text-[11px] ${selected ? "text-zinc-400" : "text-zinc-600"}`}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  const panel = (
    <div
      role="tabpanel"
      id={`panel-${surface}`}
      aria-labelledby={`tab-${surface}`}
      className={`feed-in min-h-0 flex-1 ${
        surface === "chat" || surface === "looking"
          ? "flex flex-col overflow-hidden"
          : "overflow-y-auto"
      }`}
    >
      {surface === "about" ? (
        <ChannelInfo event={event} userId={userId} initialPins={pins} />
      ) : null}

      {surface === "going" ? (
        <>
          <section className="lg:hidden">
            <h2 className="mb-4 flex items-baseline gap-2 text-lg font-semibold text-zinc-50">
              Who&apos;s going
              <span className="text-sm font-normal tabular-nums text-zinc-500">
                {attendees.length}
              </span>
            </h2>
            <AttendeeList attendees={attendees} followingIds={followingIds} />
          </section>
          <div className="hidden lg:block">
            <ChannelInfo event={event} userId={userId} initialPins={pins} />
          </div>
        </>
      ) : null}

      {surface === "chat" ? (
        <div className="flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800">
          <ChannelChat
            eventId={event.id}
            userId={userId}
            channel="general"
            channelLabel="Show chat"
            placeholder="Say hi, share plans…"
            initialPosts={chatPosts}
            selfProfile={selfProfile}
            quickPrompts={CHAT_PROMPTS}
            showHeader={false}
            className="min-h-0 flex-1"
          />
        </div>
      ) : null}

      {surface === "looking" ? (
        <div className="flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800">
          <LookingForBoard
            eventId={event.id}
            userId={userId}
            posts={boardPosts}
            replies={threadPosts}
            selfProfile={selfProfile}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] w-full flex-col px-4 pb-36 pt-4 lg:grid lg:h-[calc(100dvh-3rem)] lg:min-h-0 lg:grid-cols-[18.5rem_minmax(0,1fr)_19rem] lg:px-0 lg:pb-0 lg:pt-0">
      <aside className="lg:flex lg:h-full lg:flex-col lg:overflow-y-auto lg:border-r lg:border-zinc-800 lg:px-5 lg:py-4">
        <Link
          href="/"
          aria-label="All shows"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              d="M14.5 6.5 9 12l5.5 5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <header className="mt-3 flex gap-4 lg:mt-4 lg:flex-col">
          <BandImage
            bandName={event.band_name}
            imageUrl={event.image_url}
            venue={event.venue}
            className="h-28 w-28 shrink-0 overflow-hidden rounded-xl lg:aspect-square lg:h-auto lg:w-full"
            sizes="(max-width: 1024px) 112px, 280px"
            priority
            letterClassName="text-4xl font-black uppercase tracking-tight text-white/90"
          />
          <div className="min-w-0 space-y-2">
            <div>
              <h1 className="text-2xl font-bold leading-tight text-zinc-50">
                {event.band_name}
              </h1>
              <p className="mt-1 text-zinc-300">
                <Link
                  href={`/venues/${encodeURIComponent(event.venue)}`}
                  className="hover:text-crimson"
                >
                  {event.venue}
                </Link>
                <span className="text-zinc-500"> · {event.city}</span>
              </p>
              <FormattedTime
                iso={event.date}
                className="mt-1 block text-sm text-zinc-400"
              />
            </div>
            <FollowBandButton
              bandName={event.band_name}
              currentUserId={userId}
              initiallyFollowing={initiallyFollowingBand}
            />
          </div>
        </header>

        <div className="mt-5 hidden lg:block">
          <RsvpControls
            eventId={event.id}
            userId={userId}
            initial={myRsvp}
            onGoingSuccess={() => selectSurface("chat")}
            onBoardReady={openBoardThread}
          />
        </div>

        <div className="mt-6 hidden lg:block">{tabs("vertical")}</div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col lg:h-full lg:overflow-hidden lg:px-6 lg:py-4">
        <div className="sticky top-12 z-20 -mx-4 mt-5 border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur lg:static lg:mx-0 lg:mt-0 lg:mb-4 lg:border-b-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
          <div className="lg:hidden">{tabs("horizontal")}</div>
        </div>
        {panel}
      </div>

      <aside className="hidden min-h-0 flex-col border-l border-zinc-800 lg:flex lg:h-full lg:overflow-y-auto lg:px-4 lg:py-4">
        <h2 className="mb-4 flex items-baseline gap-2 text-lg font-semibold text-zinc-50">
          Who&apos;s going
          <span className="text-sm font-normal tabular-nums text-zinc-500">
            {attendees.length}
          </span>
        </h2>
        <AttendeeList attendees={attendees} followingIds={followingIds} />
      </aside>

      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-zinc-800 bg-zinc-950/95 px-3 py-2 backdrop-blur lg:hidden">
        <RsvpControls
          eventId={event.id}
          userId={userId}
          initial={myRsvp}
          compact
          onGoingSuccess={() => selectSurface("chat")}
          onBoardReady={openBoardThread}
        />
      </div>
    </div>
  );
}
