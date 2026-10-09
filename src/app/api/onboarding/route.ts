import { NextResponse } from "next/server";
import { CITY_COOKIE } from "@/lib/discovery";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    city?: string | null;
    genres?: string[];
    /** Dismiss SoftCityPrompt without choosing a city */
    dismiss?: boolean;
  };

  const dismissOnly = Boolean(body.dismiss) && !body.city?.trim();
  const city = body.city?.trim() || null;
  const genres = (body.genres ?? []).map((g) => g.trim()).filter(Boolean);

  const response = NextResponse.json({
    ok: true,
    city,
    genres,
    dismissed: dismissOnly,
  });

  response.cookies.set("cc_onboarded", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  if (city) {
    response.cookies.set(CITY_COOKIE, encodeURIComponent(city), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  if (city || genres.length > 0) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({
          ...(city ? { city } : {}),
          ...(genres.length ? { favorite_genres: genres } : {}),
        })
        .eq("id", user.id);
    }
  }

  return response;
}
