import { NextResponse } from "next/server";
import { resolveDiscoveryCity } from "@/lib/discovery";
import { buildExploreFeedPool, pageFeed } from "@/lib/exploreFeed";
import { citiesFromEvents, loadUpcomingEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = Math.max(0, Number(searchParams.get("cursor") ?? "0") || 0);
  const limit = Math.min(
    20,
    Math.max(4, Number(searchParams.get("limit") ?? "8") || 8),
  );
  const cityParam = searchParams.get("city")?.trim() || null;

  const { events } = await loadUpcomingEvents();
  const cities = citiesFromEvents(events);
  const { city: discovered } = await resolveDiscoveryCity(cities);
  const city = cityParam || discovered;

  const { items, error } = await buildExploreFeedPool({ city });
  if (error) {
    return NextResponse.json(
      { error, items: [], nextCursor: cursor, hasMore: false },
      { status: 500 },
    );
  }

  const { page, nextCursor, hasMore } = pageFeed(items, cursor, limit);
  return NextResponse.json({
    items: page,
    nextCursor,
    hasMore,
    total: items.length,
    city,
  });
}
