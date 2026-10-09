"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  targetUserId: string;
  currentUserId: string | null;
  initiallyFollowing: boolean;
};

export function FollowUserButton({
  targetUserId,
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
        href={`/login?next=/u`}
        className="inline-flex min-h-10 items-center rounded-md border border-zinc-700 px-4 text-sm text-zinc-200"
      >
        Sign in to follow
      </a>
    );
  }

  if (currentUserId === targetUserId) return null;

  async function toggle() {
    setError(null);
    const supabase = createClient();
    if (following) {
      const { error: err } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId!)
        .eq("following_id", targetUserId);
      if (err) {
        setError(err.message);
        return;
      }
      setFollowing(false);
    } else {
      const { error: err } = await supabase.from("follows").insert({
        follower_id: currentUserId!,
        following_id: targetUserId,
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
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => void toggle()}
        className={`min-h-10 rounded-md px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson disabled:opacity-60 ${
          following
            ? "border border-zinc-700 text-zinc-300"
            : "bg-crimson text-white"
        }`}
      >
        {following ? "Following" : "Follow"}
      </button>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
