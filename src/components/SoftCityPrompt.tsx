"use client";

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/profileOptions";

/** True while the first-time SoftCityPrompt is on screen. */
export const SoftCityPromptActiveContext = createContext(false);

export function useSoftCityPromptActive() {
  return useContext(SoftCityPromptActiveContext);
}

type GateProps = {
  needsCity: boolean;
  locale?: "en" | "cs";
  /** Rendered above the prompt (e.g. AppNav) */
  ahead?: ReactNode;
  children: ReactNode;
};

/**
 * Soft city onboarding gate: nav → prompt (first-time) → page.
 * CityContextBar hides while the prompt is visible.
 */
export function SoftCityGate({
  needsCity,
  locale = "en",
  ahead,
  children,
}: GateProps) {
  const [visible, setVisible] = useState(needsCity);

  return (
    <SoftCityPromptActiveContext.Provider value={visible}>
      {ahead}
      {visible ? (
        <SoftCityPromptBar locale={locale} onDone={() => setVisible(false)} />
      ) : null}
      {children}
    </SoftCityPromptActiveContext.Provider>
  );
}

function SoftCityPromptBar({
  locale,
  onDone,
}: {
  locale: "en" | "cs";
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const t =
    locale === "cs"
      ? {
          near: "Poblíž tebe?",
          skip: "Zatím přeskočit",
        }
      : {
          near: "Near you?",
          skip: "Skip for now",
        };

  function finish(city: string | null) {
    startTransition(async () => {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          city ? { city, genres: [] } : { dismiss: true, genres: [] },
        ),
      });
      try {
        window.localStorage.setItem("cc_last_tab", "/");
        window.localStorage.setItem("cc_seen", "1");
      } catch {
        // ignore
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/90 px-4 py-3">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:px-2 lg:px-4">
        <p className="text-sm font-medium text-zinc-200">{t.near}</p>
        <div className="flex flex-wrap items-center gap-2">
          {CITIES.map((c) => (
            <button
              key={c}
              type="button"
              disabled={pending}
              onClick={() => finish(c)}
              className="min-h-9 rounded-full border border-zinc-700 bg-zinc-900 px-3 text-xs font-medium text-zinc-200 hover:border-crimson hover:text-crimson disabled:opacity-60"
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => finish(null)}
            className="min-h-9 px-2 text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline disabled:opacity-60"
          >
            {t.skip}
          </button>
        </div>
      </div>
    </div>
  );
}
