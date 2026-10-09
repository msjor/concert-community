"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "cs";

const dict = {
  en: {
    find: "Find",
    feed: "Feed",
    people: "People",
    activity: "Activity",
    you: "You",
    comingUp: "Coming up",
    comingUpSub: "Next 14 days",
    nearYou: "Near you",
    search: "Search",
    searchPlaceholder: "Search band, venue, city…",
    attendees: "Who's going",
    yourRsvp: "Your RSVP",
    month: "Calendar",
    cityNear: "Shows near",
    seeAll: "See all",
    scenePulse: "Scene pulse",
    yourNotifications: "Your notifications",
  },
  cs: {
    find: "Najít",
    feed: "Feed",
    people: "Lidé",
    activity: "Aktivita",
    you: "Ty",
    comingUp: "Blížící se",
    comingUpSub: "Příštích 14 dní",
    nearYou: "Poblíž tebe",
    search: "Hledat",
    searchPlaceholder: "Hledej kapelu, klub, město…",
    attendees: "Kdo jde",
    yourRsvp: "Tvoje RSVP",
    month: "Kalendář",
    cityNear: "Koncerty poblíž",
    seeAll: "Zobrazit vše",
    scenePulse: "Puls scény",
    yourNotifications: "Tvoje notifikace",
  },
} as const;

type Dict = (typeof dict)[Locale];

type Ctx = {
  locale: Locale;
  t: Dict;
  setLocale: (l: Locale) => void;
};

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({
  children,
  initialLocale = "en",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const saved = window.localStorage.getItem("cc_locale");
    if (saved === "cs" || saved === "en") setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem("cc_locale", l);
    document.cookie = `cc_locale=${l};path=/;max-age=31536000;samesite=lax`;
  };

  const value = useMemo(
    () => ({ locale, t: dict[locale], setLocale }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "en" as Locale,
      t: dict.en,
      setLocale: (_: Locale) => undefined,
    };
  }
  return ctx;
}

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "cs" : "en")}
      className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-100"
      aria-label="Toggle language"
    >
      {locale === "en" ? "CS" : "EN"}
    </button>
  );
}
