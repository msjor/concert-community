import Link from "next/link";
import type { PublicProfileCard } from "@/lib/types/database";
import { FollowUserButton } from "@/components/FollowUserButton";

type Props = {
  profile: PublicProfileCard;
  currentUserId: string | null;
  initiallyFollowing?: boolean;
  showFollow?: boolean;
};

export function PersonCard({
  profile,
  currentUserId,
  initiallyFollowing = false,
  showFollow = true,
}: Props) {
  const name = profile.username ?? "Fan";
  const href = profile.username
    ? `/u/${encodeURIComponent(profile.username)}`
    : "#";

  return (
    <article className="rail-card flex w-44 shrink-0 snap-start flex-col items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 text-center lg:w-48">
      <Link href={href} className="flex flex-col items-center gap-2">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            width={72}
            height={72}
            className="h-18 w-18 h-[4.5rem] w-[4.5rem] rounded-full bg-zinc-800 object-cover ring-2 ring-zinc-800"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-zinc-800 text-xl font-semibold text-zinc-200"
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium text-zinc-100">{name}</p>
          <p className="truncate text-xs text-zinc-500">
            {profile.city ?? "Somewhere on tour"}
            {profile.usually_goes_alone ? " · often solo" : ""}
          </p>
        </div>
      </Link>
      {profile.bio ? (
        <p className="line-clamp-2 text-xs text-zinc-500">{profile.bio}</p>
      ) : profile.favorite_genres && profile.favorite_genres.length > 0 ? (
        <p className="line-clamp-2 text-xs text-zinc-500">
          {profile.favorite_genres.slice(0, 3).join(" · ")}
        </p>
      ) : null}
      {showFollow ? (
        <FollowUserButton
          targetUserId={profile.id}
          currentUserId={currentUserId}
          initiallyFollowing={initiallyFollowing}
        />
      ) : null}
    </article>
  );
}
