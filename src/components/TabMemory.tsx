"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const LAST_TAB_KEY = "cc_last_tab";
const SEEN_KEY = "cc_seen";
const BOOT_KEY = "cc_session_boot";

const PRIMARY_TABS = new Set([
  "/",
  "/explore",
  "/people",
  "/activity",
  "/profile",
]);

function normalizeTab(pathname: string): string | null {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/explore")) return "/explore";
  if (pathname.startsWith("/people")) return "/people";
  if (pathname.startsWith("/activity")) return "/activity";
  if (pathname.startsWith("/profile")) return "/profile";
  return null;
}

/**
 * Landing policy:
 * - First session ever → stay on Find (`/`). PWA start_url is `/`.
 * - Returning users: once per browser session, if they open `/` and last
 *   remembered tab was another primary tab, restore that tab.
 * - Always record the current primary tab for next time.
 */
export function useTabMemory() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const tab = normalizeTab(pathname);
    if (!tab) return;

    try {
      const seen = window.localStorage.getItem(SEEN_KEY) === "1";
      const last = window.localStorage.getItem(LAST_TAB_KEY);
      const booted = window.sessionStorage.getItem(BOOT_KEY) === "1";

      if (!booted) {
        window.sessionStorage.setItem(BOOT_KEY, "1");
        // Returning user cold-start on Find → restore last tab (not Find)
        if (
          pathname === "/" &&
          seen &&
          last &&
          PRIMARY_TABS.has(last) &&
          last !== "/"
        ) {
          router.replace(last);
          return;
        }
      }

      window.localStorage.setItem(LAST_TAB_KEY, tab);
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // private mode / blocked storage — ignore
    }
  }, [pathname, router]);
}
