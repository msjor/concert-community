import Link from "next/link";
import type { Profile } from "@/lib/types/database";

type FaceProfile = Pick<
  Profile,
  | "username"
  | "avatar_url"
  | "bio"
  | "city"
  | "favorite_genres"
  | "favorite_bands"
  | "usually_goes_alone"
  | "open_to_meet"
  | "can_drive"
>;

function Chip({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200">
      {children}
    </span>
  );
}

export function ProfileFace({
  profile,
  followerCount,
}: {
  profile: FaceProfile;
  followerCount?: number;
}) {
  const name = profile.username ?? "Fan";
  const how: string[] = [];
  if (profile.usually_goes_alone) how.push("Usually goes alone");
  if (profile.open_to_meet) how.push("Open to meet");
  if (profile.can_drive) how.push("Can drive");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            width={72}
            height={72}
            className="h-[4.5rem] w-[4.5rem] rounded-full bg-zinc-800 object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-zinc-800 text-2xl font-semibold text-zinc-100"
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-zinc-50">{name}</h1>
          <p className="text-sm text-zinc-400">
            {profile.city ? (
              <Link
                href={`/cities/${encodeURIComponent(profile.city)}`}
                className="hover:text-crimson hover:underline"
              >
                {profile.city}
              </Link>
            ) : (
              "City not set"
            )}
          </p>
          {followerCount != null ? (
            <p className="mt-1 text-xs text-zinc-500">
              {followerCount} follower{followerCount === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      </div>

      {profile.bio ? (
        <p className="whitespace-pre-wrap text-sm text-zinc-300">{profile.bio}</p>
      ) : null}

      {how.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {how.map((item) => (
            <Chip key={item}>{item}</Chip>
          ))}
        </div>
      ) : null}

      {profile.favorite_genres && profile.favorite_genres.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Genres
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.favorite_genres.map((genre) => (
              <Chip key={genre}>{genre}</Chip>
            ))}
          </div>
        </div>
      ) : null}

      {profile.favorite_bands && profile.favorite_bands.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Bands
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.favorite_bands.map((band) => (
              <Chip key={band}>{band}</Chip>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
