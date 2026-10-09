import { NextResponse } from "next/server";
import { CITY_COOKIE } from "@/lib/discovery";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { city?: string };
  const city = body.city?.trim();
  if (!city) {
    return NextResponse.json({ error: "city required" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, city });
  response.cookies.set(CITY_COOKIE, encodeURIComponent(city), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  response.cookies.set("cc_onboarded", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ city }).eq("id", user.id);
  }

  return response;
}
