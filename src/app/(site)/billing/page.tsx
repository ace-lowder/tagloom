import { redirect } from "next/navigation";
import BillingPageClient from "@/components/billing/BillingPageClient";
import {
  needsBillingProjectionRefresh,
  syncBillingProjectionForUser,
} from "@/lib/stripeBillingSync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BillingProfile = {
  subscription_tier: "monthly" | "yearly" | null;
  subscription_active: boolean;
  subscription_period_start: string | null;
  subscription_period_end: string | null;
  stripe_customer_id: string | null;
};

export default async function BillingPage() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    redirect("/login?next=/billing");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/billing");
  }

  const { data: initialProfile } = await supabase
    .from("profiles")
    .select(
      "subscription_tier, subscription_active, subscription_period_start, subscription_period_end, stripe_customer_id",
    )
    .eq("id", user.id)
    .maybeSingle<BillingProfile>();

  let profile = initialProfile ?? null;
  if (
    profile &&
    needsBillingProjectionRefresh({
      id: user.id,
      stripe_customer_id: profile.stripe_customer_id,
      subscription_tier: profile.subscription_tier,
      subscription_active: profile.subscription_active,
      subscription_period_start: profile.subscription_period_start,
      subscription_period_end: profile.subscription_period_end,
    })
  ) {
    const refreshed = await syncBillingProjectionForUser({
      userId: user.id,
      customerId: profile.stripe_customer_id,
    });
    if (refreshed) {
      profile = {
        subscription_tier: refreshed.subscription_tier,
        subscription_active: refreshed.subscription_active,
        subscription_period_start: refreshed.subscription_period_start,
        subscription_period_end: refreshed.subscription_period_end,
        stripe_customer_id: refreshed.stripe_customer_id,
      };
    }
  }

  const nextChargeAt = profile?.subscription_period_end ?? null;

  return (
    <BillingPageClient
      subscriptionActive={profile?.subscription_active === true}
      subscriptionTier={profile?.subscription_tier ?? null}
      nextChargeAt={nextChargeAt}
      canManageSubscription={Boolean(profile?.stripe_customer_id)}
    />
  );
}
