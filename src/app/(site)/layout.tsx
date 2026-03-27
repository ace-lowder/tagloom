import AppShell from "@/components/auth/AppShell";
import { toCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileSummary = {
  subscription_tier: "monthly" | "yearly" | null;
  subscription_active: boolean;
};

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let currentUser = null;

  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      currentUser = null;
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let profile: ProfileSummary | null = null;
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("subscription_tier, subscription_active")
          .eq("id", user.id)
          .maybeSingle<ProfileSummary>();
        profile = data ?? null;
      }

      currentUser = toCurrentUser(
        user,
        profile
          ? {
              subscriptionTier: profile.subscription_tier,
              subscriptionActive: profile.subscription_active,
            }
          : null,
      );
    }
  } catch {
    currentUser = null;
  }

  return <AppShell currentUser={currentUser}>{children}</AppShell>;
}
