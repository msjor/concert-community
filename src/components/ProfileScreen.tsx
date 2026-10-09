"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProfileFace } from "@/components/ProfileFace";
import { ProfileShows, type ProfileShow } from "@/components/ProfileShows";
import { createClient } from "@/lib/supabase/client";
import { BAND_SUGGESTIONS, CITIES, GENRE_OPTIONS } from "@/lib/profileOptions";
import type { Profile } from "@/lib/types/database";

function toggleItem(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function ProfileScreen({
  profile,
  email,
  shows,
}: {
  profile: Profile;
  email: string | null;
  shows: ProfileShow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [genres, setGenres] = useState(profile.favorite_genres ?? []);
  const [bands, setBands] = useState(profile.favorite_bands ?? []);
  const [usuallyAlone, setUsuallyAlone] = useState(profile.usually_goes_alone ?? false);
  const [openToMeet, setOpenToMeet] = useState(profile.open_to_meet ?? false);
  const [canDrive, setCanDrive] = useState(profile.can_drive ?? false);
  const [customGenre, setCustomGenre] = useState("");
  const [customBand, setCustomBand] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const draft: Profile = {
    ...profile,
    username: username.trim() || null,
    bio: bio.trim() || null,
    city: city.trim() || null,
    avatar_url: avatarUrl.trim() || null,
    favorite_genres: genres,
    favorite_bands: bands,
    usually_goes_alone: usuallyAlone,
    open_to_meet: openToMeet,
    can_drive: canDrive,
  };

  async function onAvatarFile(file: File) {
    if (file.size > 2_000_000) {
      setError("Photo must be under 2 MB.");
      return;
    }
    setUploading(true);
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      setError(
        uploadError.message.includes("bucket") || uploadError.message.includes("Bucket")
          ? "Avatar uploads need migration 010 (avatars bucket)."
          : uploadError.message,
      );
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const payload = {
      username: draft.username,
      bio: draft.bio,
      city: draft.city,
      avatar_url: draft.avatar_url,
      favorite_genres: genres,
      favorite_bands: bands,
      usually_goes_alone: usuallyAlone,
      open_to_meet: openToMeet,
      can_drive: canDrive,
    };

    let { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profile.id);

    if (
      updateError &&
      /open_to_meet|can_drive/i.test(updateError.message)
    ) {
      const { open_to_meet: _open, can_drive: _drive, ...rest } = payload;
      const retry = await supabase.from("profiles").update(rest).eq("id", profile.id);
      updateError = retry.error;
      if (!updateError) {
        setSaved(true);
        setEditing(false);
        setError("Saved. Run migration 010 to keep “open to meet” and “can drive”.");
        setLoading(false);
        router.refresh();
        return;
      }
    }

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setEditing(false);
      router.refresh();
    }
    setLoading(false);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const knownCities: readonly string[] = CITIES;
  const genreChoices = Array.from(new Set([...GENRE_OPTIONS, ...genres]));
  const bandChoices = Array.from(new Set([...BAND_SUGGESTIONS, ...bands]));

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(18rem,28rem)_minmax(0,1fr)]">
      {editing ? (
        <form onSubmit={onSubmit} className="max-w-3xl space-y-6 xl:col-span-2">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-[4.5rem] w-[4.5rem] rounded-full bg-zinc-800 object-cover"
              />
            ) : (
              <span className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-zinc-800 text-2xl font-semibold text-zinc-100">
                {(username || "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <label className="text-sm text-zinc-300">
              <span className="mb-1 block text-zinc-400">Photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onAvatarFile(file);
                }}
                className="block text-xs text-zinc-400 file:mr-3 file:min-h-9 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:text-xs file:text-zinc-100"
              />
              {uploading ? <span className="mt-1 block text-xs text-zinc-500">Uploading…</span> : null}
            </label>
          </div>

          <label className="block space-y-1 text-sm text-zinc-400">
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm text-zinc-400">Home city</legend>
            <div className="flex flex-wrap gap-2">
              {knownCities.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCity(option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    city === option
                      ? "bg-crimson text-white"
                      : "border border-zinc-700 text-zinc-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <input
              value={knownCities.includes(city) ? "" : city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Other city"
              className="min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
            />
          </fieldset>

          <label className="block space-y-1 text-sm text-zinc-400">
            Bio
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Usually in the pit · train from Brno"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm text-zinc-400">How I go</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["alone", "Usually go alone", usuallyAlone, setUsuallyAlone],
                  ["meet", "Open to meet", openToMeet, setOpenToMeet],
                  ["drive", "Can drive", canDrive, setCanDrive],
                ] as const
              ).map(([key, label, on, setOn]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOn(!on)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    on ? "bg-crimson text-white" : "border border-zinc-700 text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm text-zinc-400">Genres</legend>
            <div className="flex flex-wrap gap-2">
              {genreChoices.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setGenres((current) => toggleItem(current, genre))}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    genres.includes(genre)
                      ? "bg-zinc-100 text-zinc-950"
                      : "border border-zinc-700 text-zinc-400"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                placeholder="Add a genre"
                className="min-h-11 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
              />
              <button
                type="button"
                onClick={() => {
                  const next = customGenre.trim();
                  if (!next) return;
                  setGenres((current) => (current.includes(next) ? current : [...current, next]));
                  setCustomGenre("");
                }}
                className="min-h-11 rounded-md border border-zinc-700 px-3 text-sm text-zinc-200"
              >
                Add
              </button>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm text-zinc-400">Bands</legend>
            <div className="flex flex-wrap gap-2">
              {bandChoices.map((band) => (
                <button
                  key={band}
                  type="button"
                  onClick={() => setBands((current) => toggleItem(current, band))}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    bands.includes(band)
                      ? "bg-zinc-100 text-zinc-950"
                      : "border border-zinc-700 text-zinc-400"
                  }`}
                >
                  {band}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customBand}
                onChange={(e) => setCustomBand(e.target.value)}
                placeholder="Add a band"
                className="min-h-11 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
              />
              <button
                type="button"
                onClick={() => {
                  const next = customBand.trim();
                  if (!next) return;
                  setBands((current) => (current.includes(next) ? current : [...current, next]));
                  setCustomBand("");
                }}
                className="min-h-11 rounded-md border border-zinc-700 px-3 text-sm text-zinc-200"
              >
                Add
              </button>
            </div>
          </fieldset>

          <p className="text-xs text-zinc-500">{email}</p>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 rounded-md bg-crimson px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save profile"}
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername(profile.username ?? "");
                setBio(profile.bio ?? "");
                setCity(profile.city ?? "");
                setAvatarUrl(profile.avatar_url ?? "");
                setGenres(profile.favorite_genres ?? []);
                setBands(profile.favorite_bands ?? []);
                setUsuallyAlone(profile.usually_goes_alone ?? false);
                setOpenToMeet(profile.open_to_meet ?? false);
                setCanDrive(profile.can_drive ?? false);
                setEditing(false);
                setError(null);
              }}
              className="min-h-11 rounded-md border border-zinc-700 px-4 text-sm text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-11 rounded-md px-3 text-sm text-zinc-500 hover:text-zinc-200"
            >
              Sign out
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <ProfileFace profile={profile} />
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/activity"
                aria-label="Activity"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path
                    d="M6 17h12l-1.2-2.2a6.4 6.4 0 0 1-.8-3.1V9.5a4 4 0 1 0-8 0v2.2c0 1.1-.3 2.2-.8 3.1L6 17Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 19a2 2 0 0 0 4 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </Link>
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit profile"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path
                    d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
          {profile.username ? (
            <p className="text-xs text-zinc-500">
              Public page /u/{profile.username}
            </p>
          ) : (
            <p className="text-xs text-zinc-500">Add a username so people can find you.</p>
          )}
        </div>
      )}

      {saved && !editing ? <p className="text-sm text-emerald-400">Profile saved.</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <div className={editing ? "xl:col-span-2" : undefined}>
        <ProfileShows items={shows} />
      </div>
    </div>
  );
}
