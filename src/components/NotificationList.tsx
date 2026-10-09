"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormattedTime } from "@/components/FormattedTime";
import type { Notification } from "@/lib/types/database";

/** Soften legacy Discord-style titles from older notification rows. */
function displayTitle(title: string) {
  return title
    .replace(/#general\b/gi, "Chat")
    .replace(/#looking-for\b/gi, "Looking for")
    .replace(/#meetups\b/gi, "Plan")
    .replace(/#setlist-pit\b/gi, "Setlist")
    .replace(/#info\b/gi, "About");
}

export function NotificationList({
  notifications,
}: {
  notifications: Notification[];
}) {
  const router = useRouter();

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    router.refresh();
  }

  async function markAllRead() {
    const supabase = createClient();
    const unread = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unread.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unread);
    router.refresh();
  }

  if (notifications.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No activity yet. RSVP to shows to get notified about chat and who’s going.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => void markAllRead()}
        className="text-sm text-crimson underline-offset-2 hover:underline"
      >
        Mark all read
      </button>
      <ul className="divide-y divide-zinc-800">
        {notifications.map((n) => (
          <li key={n.id} className={`py-3 ${n.read ? "opacity-60" : ""}`}>
            <Link
              href={n.href ?? "/"}
              onClick={() => {
                if (!n.read) void markRead(n.id);
              }}
              className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-zinc-100">
                  {displayTitle(n.title)}
                </span>
                <FormattedTime
                  iso={n.created_at}
                  className="text-xs text-zinc-500"
                />
              </div>
              {n.body ? <p className="mt-1 text-sm text-zinc-400">{n.body}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
