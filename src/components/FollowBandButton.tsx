"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  bandName: string;
  currentUserId: string | null;
  initiallyFollowing: boolean;
};

export function FollowBandButton({
  bandName,
  currentUserId,
  initiallyFollowing,
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!currentUserId) {
    return (
      <a
        href="/login"
        className="text-xs text-crimson underline-offset-2 hover:underline"
      >
        Sign in to follow {bandName}
      </a>
    );
  }

  async function toggle() {
    setError(null);
    const supabase = createClient();
    if (following) {
      const { error: err } = await supabase
        .from("band_follows")
        .delete()
        .eq("user_id", currentUserId!)
        .eq("band_name", bandName);
      if (err) {
        setError(err.message);
        return;
      }
      setFollowing(false);
    } else {
      const { error: err } = await supabase.from("band_follows").insert({
        user_id: currentUserId!,
        band_name: bandName,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setFollowing(true);
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void toggle()}
        aria-label={following ? `Following ${bandName}` : `Follow ${bandName}`}
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson disabled:opacity-60 ${
          following
            ? "border-zinc-700 text-zinc-200"
            : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-50"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            d="M12 3.5 14.4 9l6 .5-4.6 3.9 1.4 5.8L12 16.8 6.8 19.2 8.2 13.4 3.6 9.5 9.6 9 12 3.5Z"
            fill={following ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        {following ? <span className="text-xs font-medium">Following</span> : null}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
