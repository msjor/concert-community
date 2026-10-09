import { cookies } from "next/headers";
import { AppNav } from "@/components/AppNav";
import { LocaleProvider } from "@/components/LocaleProvider";
import { SoftCityGate } from "@/components/SoftCityPrompt";
import { createClient } from "@/lib/supabase/server";

export async function AppChrome({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const onboarded = jar.get("cc_onboarded")?.value === "1";
  const localeCookie = jar.get("cc_locale")?.value;
  const locale = localeCookie === "cs" ? "cs" : "en";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unreadCount = 0;
  let needsCity = !onboarded;

  if (user) {
    const [{ count }, { data: profile }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false),
      supabase
        .from("profiles")
        .select("city")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    unreadCount = count ?? 0;
    // City alone is enough — genres stay on Profile
    if (profile?.city?.trim()) {
      needsCity = false;
    }
  }

  return (
    <LocaleProvider initialLocale={locale}>
      <SoftCityGate
        needsCity={needsCity}
        locale={locale}
        ahead={<AppNav unreadCount={unreadCount} />}
      >
        {children}
      </SoftCityGate>
    </LocaleProvider>
  );
}
