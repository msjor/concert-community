"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { useTabMemory } from "@/components/TabMemory";

const tabs = [
  { href: "/", key: "find" as const, icon: FindIcon },
  { href: "/explore", key: "feed" as const, icon: FeedIcon },
  { href: "/people", key: "people" as const, icon: PeopleIcon },
  { href: "/profile", key: "you" as const, icon: ProfileIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/explore") {
    return pathname.startsWith("/explore");
  }
  return pathname.startsWith(href);
}

function FindIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FeedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M7 9h10M7 12.5h10M7 16h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3.5 19c.8-2.6 2.8-4 5.5-4s4.7 1.4 5.5 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M15.5 19c.4-1.6 1.5-2.7 3.2-3.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5 19c1.2-3.2 3.6-5 7-5s5.8 1.8 7 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const { t } = useLocale();
  useTabMemory();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="flex h-12 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-sm font-semibold tracking-wide text-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
          >
            Concert Community
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 lg:flex"
          >
            {tabs.map(({ href, key, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={t[key]}
                  className={`relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson ${
                    active
                      ? "bg-zinc-800 text-zinc-50"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {active ? <span>{t[key]}</span> : null}
                  {key === "you" && unreadCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson px-1 text-[10px] text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            <Link
              href="/calendar"
              aria-label={t.month}
              className={`inline-flex items-center rounded-md p-2 ${
                pathname.startsWith("/calendar")
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
            </Link>
          </nav>

          <div className="flex items-center gap-1 lg:hidden">
            <Link
              href="/calendar"
              className={`rounded-md p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson ${
                pathname.startsWith("/calendar")
                  ? "text-crimson"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
              aria-label={t.month}
            >
              <CalendarIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur lg:hidden"
      >
        <ul className="flex items-stretch justify-around">
          {tabs.map(({ href, key, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson ${
                    active ? "text-crimson" : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{t[key]}</span>
                  {key === "you" && unreadCount > 0 ? (
                    <span className="absolute right-[18%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson px-1 text-[9px] font-semibold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
