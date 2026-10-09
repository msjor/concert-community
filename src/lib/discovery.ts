import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const CITY_COOKIE = "cc_city";

/** Resolve discovery city: profile → cookie → most common event city → Praha. */
export async function resolveDiscoveryCity(
  availableCities: string[] = [],
): Promise<{ city: string; source: "profile" | "cookie" | "default" }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("city")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.city?.trim()) {
      return { city: profile.city.trim(), source: "profile" };
    }
  }

  const jar = await cookies();
  const fromCookie = jar.get(CITY_COOKIE)?.value;
  if (fromCookie?.trim()) {
    return { city: decodeURIComponent(fromCookie.trim()), source: "cookie" };
  }

  const fallback = availableCities[0] ?? "Praha";
  return { city: fallback, source: "default" };
}

export function weekAheadIso(from = new Date()) {
  return daysAheadIso(7, from);
}

/** Inclusive window for “Coming up” discovery rails (default 14 days). */
export function daysAheadIso(days: number, from = new Date()) {
  const end = new Date(from);
  end.setDate(end.getDate() + days);
  return end.toISOString();
}
