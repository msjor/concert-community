"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Attendee, AttendeeStatus, BoardCategory, BoardSide } from "@/lib/types/database";

type IntentState = {
  looking_for_company: boolean;
  looking_for_ride: boolean;
  offering_ride: boolean;
  has_tickets: boolean;
  going_alone: boolean;
  hide_name: boolean;
  ride_from: string;
  ride_seats: string;
};

type PlanKey =
  | "looking_for_company"
  | "has_tickets"
  | "looking_for_ride"
  | "offering_ride";

type Props = {
  eventId: string;
  userId: string | null;
  initial: Attendee | null;
  /** Compact sticky-bar style: status plus a plans sheet */
  compact?: boolean;
  /** Jump to the full plans (used when this control only shows status). */
  onEditPlans?: () => void;
  /** Fired from the Chat link after you're going */
  onGoingSuccess?: () => void;
  /** Open a looking-for thread after the user pins an RSVP intent. */
  onBoardReady?: (postId: string) => void;
};

type PinDraft = {
  side: BoardSide;
  category: BoardCategory;
  title: string;
  details: string | null;
};

const PLANS: {
  key: PlanKey;
  title: string;
  detail: string;
  goingOnly?: boolean;
}[] = [
  {
    key: "looking_for_company",
    title: "Open to meet",
    detail: "Happy to say hi at the show",
    goingOnly: true,
  },
  {
    key: "has_tickets",
    title: "Have tickets",
    detail: "You already have a way in",
  },
  {
    key: "looking_for_ride",
    title: "Need a ride",
    detail: "Looking for a lift",
  },
  {
    key: "offering_ride",
    title: "Offering a ride",
    detail: "You can take someone",
  },
];

function fromAttendee(a: Attendee | null): IntentState {
  return {
    looking_for_company: a?.looking_for_company ?? false,
    looking_for_ride: a?.looking_for_ride ?? false,
    offering_ride: a?.offering_ride ?? false,
    has_tickets: a?.has_tickets ?? false,
    going_alone: a?.going_alone ?? false,
    hide_name: a?.hide_name ?? false,
    ride_from: a?.ride_from ?? "",
    ride_seats: a?.ride_seats != null ? String(a.ride_seats) : "",
  };
}

function normalized(nextStatus: AttendeeStatus, base: IntentState): IntentState {
  const looking = nextStatus === "going" ? base.looking_for_company : false;
  return {
    ...base,
    looking_for_company: looking,
    going_alone: nextStatus === "going" && !looking ? base.going_alone : false,
  };
}

function plansSummary(status: AttendeeStatus, intents: IntentState) {
  const parts: string[] = [];
  if (status === "going" && intents.looking_for_company) parts.push("open to meet");
  if (intents.has_tickets) parts.push("tickets");
  if (intents.looking_for_ride) parts.push("need a ride");
  if (intents.offering_ride) parts.push("offering a ride");
  if (intents.hide_name) parts.push("name hidden");
  if (parts.length === 0) return "Tickets, rides, meet people";
  return parts.join(" · ");
}

export function RsvpControls({
  eventId,
  userId,
  initial,
  compact = false,
  onEditPlans,
  onGoingSuccess,
  onBoardReady,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<AttendeeStatus | null>(
    initial?.status ?? null,
  );
  const [intents, setIntents] = useState<IntentState>(() =>
    fromAttendee(initial),
  );
  const [plansOpen, setPlansOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState<PinDraft | null>(null);
  const [pinning, setPinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!plansOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPlansOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plansOpen]);

  if (!userId) {
    return (
      <p className="text-sm text-zinc-400">
        <a
          href="/login"
          className="text-crimson underline-offset-2 hover:underline"
        >
          Sign in
        </a>{" "}
        to say you&apos;re going.
      </p>
    );
  }

  async function save(
    nextStatus: AttendeeStatus,
    nextIntents: IntentState = intents,
  ) {
    setError(null);
    const supabase = createClient();
    const seats =
      nextIntents.ride_seats.trim() === ""
        ? null
        : Number.parseInt(nextIntents.ride_seats, 10);

    const payload = normalized(nextStatus, nextIntents);

    const { error: upsertError } = await supabase.from("attendees").upsert(
      {
        event_id: eventId,
        user_id: userId!,
        status: nextStatus,
        looking_for_company: payload.looking_for_company,
        looking_for_ride: payload.looking_for_ride,
        offering_ride: payload.offering_ride,
        has_tickets: payload.has_tickets,
        going_alone: payload.going_alone,
        hide_name: payload.hide_name,
        ride_from: payload.ride_from.trim() || null,
        ride_seats: Number.isFinite(seats) ? seats : null,
      },
      { onConflict: "event_id,user_id" },
    );

    if (upsertError) {
      setError(upsertError.message);
      return false;
    }

    setStatus(nextStatus);
    setIntents(payload);
    startTransition(() => router.refresh());
    return true;
  }

  async function clearRsvp() {
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("attendees")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId!);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setStatus(null);
    setIntents(fromAttendee(null));
    setPlansOpen(false);
    setPinDraft(null);
    startTransition(() => router.refresh());
  }

  function promptForNewIntent(prev: IntentState, next: IntentState) {
    if (!prev.looking_for_company && next.looking_for_company) {
      setPinDraft({
        side: "want",
        category: "company",
        title: "Looking for company",
        details: "Open to meet at this show.",
      });
      return;
    }
    if (!prev.looking_for_ride && next.looking_for_ride) {
      const from = next.ride_from.trim();
      setPinDraft({
        side: "want",
        category: "ride",
        title: from ? `Need a ride from ${from}` : "Need a ride",
        details: from ? `Leaving from ${from}.` : null,
      });
      return;
    }
    if (!prev.offering_ride && next.offering_ride) {
      const from = next.ride_from.trim();
      const seats = next.ride_seats.trim();
      setPinDraft({
        side: "offer",
        category: "ride",
        title: seats ? `Offering a ride · ${seats} seats` : "Offering a ride",
        details: from ? `Leaving from ${from}.` : null,
      });
    }
  }

  function toggleOpenToMeet() {
    if (status !== "going") return;
    const next = {
      ...intents,
      looking_for_company: !intents.looking_for_company,
      going_alone: false,
    };
    promptForNewIntent(intents, next);
    void save("going", next);
  }

  function togglePlan(key: PlanKey) {
    if (!status) return;
    if (key === "looking_for_company") {
      toggleOpenToMeet();
      return;
    }
    const turningOn = !intents[key];
    const next: IntentState = {
      ...intents,
      [key]: turningOn,
    };
    if (key === "looking_for_ride" && turningOn) next.offering_ride = false;
    if (key === "offering_ride" && turningOn) next.looking_for_ride = false;
    promptForNewIntent(intents, next);
    void save(status, next);
  }

  async function chooseStatus(nextStatus: AttendeeStatus) {
    if (nextStatus === status) {
      if (compact) setPlansOpen(true);
      else onEditPlans?.();
      return;
    }
    const ok = await save(nextStatus);
    if (!ok) return;
    if (compact) setPlansOpen(true);
    else onEditPlans?.();
  }

  async function pinDraftOnBoard() {
    if (!userId || !pinDraft) return;
    setPinning(true);
    setError(null);
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("event_board_posts")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("side", pinDraft.side)
      .eq("category", pinDraft.category)
      .eq("status", "open")
      .maybeSingle();

    if (existing?.id) {
      setPinDraft(null);
      setPinning(false);
      onBoardReady?.(existing.id);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("event_board_posts")
      .insert({
        event_id: eventId,
        user_id: userId,
        side: pinDraft.side,
        category: pinDraft.category,
        title: pinDraft.title,
        details: pinDraft.details,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not pin that.");
      setPinning(false);
      return;
    }

    const id = data.id;
    setPinDraft(null);
    setPinning(false);
    onBoardReady?.(id);
  }

  const hint =
    status === "going"
      ? "You'll be there. Add anything others should know."
      : status === "interested"
        ? "Saved for later. Switch to Going when you're sure."
        : "Going if you'll be there. Interested just saves the show.";

  const visiblePlans = PLANS.filter(
    (plan) => !plan.goingOnly || status === "going",
  );

  const plansBody = status ? (
    <div className="space-y-2">
      <div className="space-y-2" role="group" aria-label="Plans">
        {visiblePlans.map((plan) => {
          const on = Boolean(intents[plan.key]);
          return (
            <button
              key={plan.key}
              type="button"
              aria-pressed={on}
              disabled={pending}
              onClick={() => togglePlan(plan.key)}
              className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson disabled:opacity-60 ${
                on
                  ? "border-crimson bg-crimson/15 text-zinc-50"
                  : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500"
              }`}
            >
              <span>
                <span className="block text-sm font-medium">{plan.title}</span>
                <span
                  className={`mt-0.5 block text-xs ${on ? "text-zinc-300" : "text-zinc-500"}`}
                >
                  {plan.detail}
                </span>
              </span>
              <span
                className={`mt-0.5 shrink-0 text-xs font-medium ${
                  on ? "text-crimson" : "text-zinc-500"
                }`}
              >
                {on ? "On" : "Add"}
              </span>
            </button>
          );
        })}
      </div>

      {intents.offering_ride || intents.looking_for_ride ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1 text-sm text-zinc-400">
            Leaving from
            <input
              value={intents.ride_from}
              onChange={(e) =>
                setIntents((s) => ({ ...s, ride_from: e.target.value }))
              }
              onBlur={() => void save(status)}
              placeholder="e.g. Brno, Plzeň…"
              className="min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
            />
          </label>
          {intents.offering_ride ? (
            <label className="block space-y-1 text-sm text-zinc-400">
              Seats free
              <input
                type="number"
                min={0}
                value={intents.ride_seats}
                onChange={(e) =>
                  setIntents((s) => ({
                    ...s,
                    ride_seats: e.target.value,
                  }))
                }
                onBlur={() => void save(status)}
                className="min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        aria-pressed={intents.hide_name}
        disabled={pending}
        onClick={() => {
          const next = { ...intents, hide_name: !intents.hide_name };
          void save(status, next);
        }}
        className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson disabled:opacity-60 ${
          intents.hide_name
            ? "border-zinc-500 bg-zinc-800 text-zinc-100"
            : "border-zinc-800 bg-transparent text-zinc-300 hover:border-zinc-600"
        }`}
      >
        <span>
          <span className="block text-sm font-medium">Hide my name</span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            Listed as Anonymous fan
          </span>
        </span>
        <span className="mt-0.5 shrink-0 text-xs font-medium text-zinc-500">
          {intents.hide_name ? "On" : "Add"}
        </span>
      </button>

      {pinDraft ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-3">
          <p className="text-sm text-zinc-200">
            Post “{pinDraft.title}” on Looking for so people can reply?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pinning}
              onClick={() => void pinDraftOnBoard()}
              className="min-h-9 rounded-md bg-crimson px-3 text-xs font-medium text-white disabled:opacity-60"
            >
              {pinning ? "Posting…" : "Post it"}
            </button>
            <button
              type="button"
              onClick={() => setPinDraft(null)}
              className="min-h-9 px-2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
        {status === "going" && onGoingSuccess ? (
          <button
            type="button"
            onClick={() => {
              setPlansOpen(false);
              onGoingSuccess();
            }}
            className="text-sm text-crimson underline-offset-2 hover:underline"
          >
            Say hi in Chat
          </button>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => void clearRsvp()}
          className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline disabled:opacity-60"
        >
          Not going
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      {compact && plansOpen && status ? (
        <>
          <button
            type="button"
            aria-label="Close plans"
            className="fixed inset-0 z-20 bg-black/50"
            onClick={() => setPlansOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Plans for this show"
            className="fixed inset-x-3 bottom-[10.75rem] z-30 max-h-[min(70vh,28rem)] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-50">
                  Add to your plans
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>
              </div>
              <button
                type="button"
                onClick={() => setPlansOpen(false)}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Done
              </button>
            </div>
            {plansBody}
            {error ? (
              <p role="alert" className="mt-2 text-sm text-red-400">
                {error}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="relative z-30">
        {!compact ? (
          <p className="mb-2 text-sm font-medium text-zinc-200">Are you going?</p>
        ) : null}
        <div
          role="radiogroup"
          aria-label="Are you going?"
          className="flex gap-2"
        >
          <button
            type="button"
            role="radio"
            aria-checked={status === "going"}
            disabled={pending}
            onClick={() => void chooseStatus("going")}
            className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson disabled:opacity-60 ${
              status === "going"
                ? "border-crimson bg-crimson text-white"
                : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500"
            }`}
          >
            <span className="block text-sm font-medium">Going</span>
            {!compact ? (
              <span
                className={`block text-[11px] leading-snug ${
                  status === "going" ? "text-white/80" : "text-zinc-500"
                }`}
              >
                I&apos;ll be there
              </span>
            ) : null}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={status === "interested"}
            disabled={pending}
            onClick={() => void chooseStatus("interested")}
            className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson disabled:opacity-60 ${
              status === "interested"
                ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500"
            }`}
          >
            <span className="block text-sm font-medium">Interested</span>
            {!compact ? (
              <span
                className={`block text-[11px] leading-snug ${
                  status === "interested" ? "text-zinc-600" : "text-zinc-500"
                }`}
              >
                Save for later
              </span>
            ) : null}
          </button>
        </div>

        {compact && status ? (
          <button
            type="button"
            aria-expanded={plansOpen}
            onClick={() => setPlansOpen((open) => !open)}
            className="mt-2 flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-zinc-700 px-3 text-left text-xs text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
          >
            <span className="truncate">{plansSummary(status, intents)}</span>
            <span className="shrink-0 text-zinc-500">
              {plansOpen ? "Close" : "Edit"}
            </span>
          </button>
        ) : null}

        {!compact && onEditPlans && status ? (
          <button
            type="button"
            onClick={onEditPlans}
            className="mt-2 flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-zinc-700 px-3 text-left text-xs text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
          >
            <span className="truncate">{plansSummary(status, intents)}</span>
            <span className="shrink-0 text-zinc-500">Edit</span>
          </button>
        ) : null}
      </div>

      {!compact ? (
        <p className="text-xs leading-relaxed text-zinc-500">{hint}</p>
      ) : null}
      {!compact && !onEditPlans ? plansBody : null}

      {error && !(compact && plansOpen) ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
