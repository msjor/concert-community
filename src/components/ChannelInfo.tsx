"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { EventInfo } from "@/components/EventInfo";
import { FormattedTime } from "@/components/FormattedTime";
import type { Event, EventPinWithProfile } from "@/lib/types/database";

type Props = {
  event: Event;
  userId: string | null;
  initialPins: EventPinWithProfile[];
};

export function ChannelInfo({ event, userId, initialPins }: Props) {
  const router = useRouter();
  const [pins, setPins] = useState(initialPins);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addPin(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !content.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("event_pins")
      .insert({
        event_id: event.id,
        user_id: userId,
        content: content.trim(),
      })
      .select(
        "id, event_id, user_id, content, created_at, profiles(id, username, avatar_url)",
      )
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not pin tip.");
      setSaving(false);
      return;
    }

    setPins((prev) => [data as unknown as EventPinWithProfile, ...prev]);
    setContent("");
    setSaving(false);
    router.refresh();
  }

  async function removePin(id: string) {
    if (!userId) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("event_pins")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPins((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <EventInfo event={event} />

      <section className="space-y-3" aria-labelledby="pins-heading">
        <h3 id="pins-heading" className="text-base font-semibold text-zinc-50">
          Pinned tips
        </h3>
        <p className="text-sm text-zinc-500">
          Bag policy, best rail, cloakroom, last train — pin what others should know.
        </p>

        {pins.length === 0 ? (
          <p className="text-sm text-zinc-500">No pins yet.</p>
        ) : (
          <ul className="space-y-3">
            {pins.map((pin) => (
              <li
                key={pin.id}
                className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap text-zinc-200">{pin.content}</p>
                  {userId === pin.user_id ? (
                    <button
                      type="button"
                      onClick={() => void removePin(pin.id)}
                      className="shrink-0 text-xs text-zinc-500 hover:text-red-400"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {pin.profiles?.username ?? "Fan"} ·{" "}
                  <FormattedTime iso={pin.created_at} />
                </p>
              </li>
            ))}
          </ul>
        )}

        {userId ? (
          <form onSubmit={addPin} className="space-y-2 pt-2">
            <label htmlFor="pin-content" className="sr-only">
              Tip
            </label>
            <textarea
              id="pin-content"
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. No backpacks · S-Bahn until 1am"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
            />
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="min-h-11 rounded-md bg-crimson px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Pinning…" : "Pin tip"}
            </button>
            {error ? (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            ) : null}
          </form>
        ) : (
          <p className="text-sm text-zinc-400">
            <Link href="/login" className="text-crimson underline-offset-2 hover:underline">
              Sign in
            </Link>{" "}
            to pin a tip.
          </p>
        )}
      </section>
    </div>
  );
}
