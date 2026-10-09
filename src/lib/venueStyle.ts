/** Soft venue-colored gradients as image fallback accents. */

export function venueAccentClass(venue: string): string {
  const v = venue.toLowerCase();
  if (v.includes("o2 arena") || v.includes("o2 universum")) {
    return "bg-gradient-to-br from-red-800 via-zinc-900 to-zinc-950";
  }
  if (v.includes("forum")) {
    return "bg-gradient-to-br from-amber-800/90 via-zinc-900 to-zinc-950";
  }
  if (v.includes("lucerna") || v.includes("sasazu") || v.includes("archa")) {
    return "bg-gradient-to-br from-zinc-700 via-zinc-900 to-zinc-950";
  }
  if (
    v.includes("melodka") ||
    v.includes("futurum") ||
    v.includes("cross") ||
    v.includes("barrák") ||
    v.includes("barrak") ||
    v.includes("kabinet") ||
    v.includes("garage")
  ) {
    return "bg-gradient-to-br from-emerald-900 via-zinc-900 to-zinc-950";
  }
  if (
    v.includes("vodova") ||
    v.includes("gong") ||
    v.includes("euronics") ||
    v.includes("aldis")
  ) {
    return "bg-gradient-to-br from-sky-900 via-zinc-900 to-zinc-950";
  }
  return "bg-gradient-to-br from-crimson/80 via-zinc-900 to-zinc-950";
}
