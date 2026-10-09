import Link from "next/link";
import { NotificationList } from "@/components/NotificationList";
import { PageShell } from "@/components/PageShell";
import { FormattedTime } from "@/components/FormattedTime";
import { loadUpcomingEvents } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types/database";

export const metadata = {
  title: "Activity",
};

type PulseItem = {
  id: string;
  kind: "friend" | "band";
  title: string;
  body: string;
  href: string;
  created_at: string;
};

export default async function ActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { events } = await loadUpcomingEvents();
  const eventById = new Map(events.map((e) => [e.id, e]));

  let pulse: PulseItem[] = [];

  if (user) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    const followingIds = (follows ?? []).map((f) => f.following_id);

    if (followingIds.length > 0) {
      const { data: friendRsvps } = await supabase
        .from("attendees")
        .select(
          "id, event_id, user_id, status, created_at, looking_for_company, going_alone",
        )
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(12);

      const userIds = [...new Set((friendRsvps ?? []).map((r) => r.user_id))];
      const { data: profiles } =
        userIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, username")
              .in("id", userIds)
          : { data: [] as { id: string; username: string | null }[] };
      const nameById = new Map(
        (profiles ?? []).map((p) => [p.id, p.username ?? "Fan"]),
      );

      for (const row of friendRsvps ?? []) {
        const ev = eventById.get(row.event_id);
        const who = nameById.get(row.user_id) ?? "Someone you follow";
        pulse.push({
          id: `f-${row.id}`,
          kind: "friend",
          title: `${who} is ${row.status}${
            row.looking_for_company || row.going_alone ? " · open to meet" : ""
          }`,
          body: ev ? `${ev.band_name} · ${ev.venue}` : "a show",
          href: `/events/${row.event_id}?channel=going`,
          created_at: row.created_at,
        });
      }
    }

    const { data: bandFollows } = await supabase
      .from("band_follows")
      .select("band_name, created_at")
      .eq("user_id", user.id);
    const followed = new Set(
      (bandFollows ?? []).map((b) => b.band_name.toLowerCase()),
    );
    if (followed.size > 0) {
      const followAt = new Map(
        (bandFollows ?? []).map((b) => [
          b.band_name.toLowerCase(),
          b.created_at,
        ]),
      );
      for (const ev of events.slice(0, 20)) {
        if (!followed.has(ev.band_name.toLowerCase())) continue;
        pulse.push({
          id: `band-${ev.id}`,
          kind: "band",
          title: `${ev.band_name} is coming`,
          body: `${ev.venue} · ${ev.city}`,
          href: `/events/${ev.id}`,
          created_at:
            followAt.get(ev.band_name.toLowerCase()) ??
            new Date().toISOString(),
        });
      }
    }
  }

  pulse = pulse
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 15);

  let notifications: Notification[] = [];
  let unread = 0;
  if (user) {
    const { data } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, body, href, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    notifications = (data ?? []) as Notification[];
    unread = notifications.filter((n) => !n.read).length;
  }

  return (
    <PageShell>
      <div className="space-y-8">
        <header className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-2xl font-bold text-zinc-50">Activity</h1>
            {unread > 0 ? (
              <span className="rounded-full bg-crimson px-2 py-0.5 text-xs font-semibold text-white">
                {unread} new
              </span>
            ) : null}
          </div>
          <p className="text-sm text-zinc-400">
            Friend RSVPs, bands you follow, and chat on shows you&apos;re going to.
          </p>
        </header>

        <div className="grid items-start gap-8 xl:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-50">Following</h2>
          {!user ? (
            <p className="text-sm text-zinc-400">
              <Link
                href="/login?next=/activity"
                className="text-crimson underline-offset-2 hover:underline"
              >
                Sign in
              </Link>{" "}
              to see people and bands you follow.
            </p>
          ) : pulse.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Follow fans or a band — their next shows show up here.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
              {pulse.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="block px-3 py-3 transition-colors hover:bg-zinc-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs uppercase tracking-wide text-crimson">
                        {item.kind === "friend" ? "friend RSVP" : "band alert"}
                      </span>
                      <FormattedTime
                        iso={item.created_at}
                        className="text-xs text-zinc-500"
                      />
                    </div>
                    <p className="mt-1 font-medium text-zinc-100">{item.title}</p>
                    <p className="text-sm text-zinc-500">{item.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3 border-t border-zinc-900 pt-8 xl:border-t-0 xl:pt-0">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Notifications
          </h2>
          {!user ? (
            <p className="text-sm text-zinc-400">
              <Link
                href="/login?next=/activity"
                className="text-crimson underline-offset-2 hover:underline"
              >
                Sign in
              </Link>{" "}
              for chat updates on shows you RSVP to.
            </p>
          ) : (
            <>
              <p className="text-sm text-zinc-400">
                {unread > 0
                  ? `${unread} unread update${unread === 1 ? "" : "s"}.`
                  : "You're caught up."}
              </p>
              <NotificationList notifications={notifications} />
            </>
          )}
        </section>
        </div>
      </div>
    </PageShell>
  );
}
