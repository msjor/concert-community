"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { useSoftCityPromptActive } from "@/components/SoftCityPrompt";

type Props = {
  cities: string[];
  currentCity: string;
  source?: "profile" | "cookie" | "default";
  /** Large city name that is also the switcher. */
  variant?: "field" | "title";
};

export function CityContextBar({
  cities,
  currentCity,
  source,
  variant = "field",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const [pending, startTransition] = useTransition();
  const softCityActive = useSoftCityPromptActive();

  // SoftCityPrompt is the first-time path; hide the bar while it's up
  if (softCityActive) return null;

  function onChange(city: string) {
    startTransition(async () => {
      await fetch("/api/city", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      });
      router.refresh();
      if (pathname.startsWith("/cities/")) {
        router.push(`/cities/${encodeURIComponent(city)}`);
      }
    });
  }

  if (variant === "title") {
    return (
      <label className="inline-flex max-w-full flex-col">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          Concerts in
        </span>
        <span className="mt-1 inline-flex items-center gap-2">
          <select
            value={currentCity}
            disabled={pending || cities.length === 0}
            onChange={(e) => onChange(e.target.value)}
            aria-label="City"
            style={{ fieldSizing: "content" }}
            className="cursor-pointer appearance-none bg-transparent text-4xl font-bold tracking-tight text-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson disabled:opacity-60"
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span aria-hidden className="text-xl text-zinc-500">
            ▾
          </span>
        </span>
      </label>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 pl-3 pr-1 text-sm text-zinc-300">
        <span className="text-zinc-500">{t.cityNear}</span>
        <select
          value={currentCity}
          disabled={pending || cities.length === 0}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-9 rounded-full border-0 bg-transparent py-1 pr-2 font-semibold text-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
          aria-label="City"
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <Link
        href={`/cities/${encodeURIComponent(currentCity)}`}
        className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
      >
        {t.seeAll}
      </Link>
      {source === "default" ? (
        <span className="text-xs text-zinc-600">Tap a city above to personalize</span>
      ) : null}
    </div>
  );
}
