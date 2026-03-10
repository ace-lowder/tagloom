import { redirect } from "next/navigation";
import type Stripe from "stripe";
import BillingPageClient from "@/components/billing/BillingPageClient";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BillingProfile = {
  subscription_tier: "monthly" | "yearly" | null;
  subscription_active: boolean;
  subscription_period_end: string | null;
  stripe_customer_id: string | null;
};

async function resolveNextChargeAt(profile: BillingProfile | null) {
  if (!profile) return null;
  if (profile.subscription_period_end) return profile.subscription_period_end;
  if (!profile.subscription_active || !profile.stripe_customer_id) return null;

  const stripe = getStripeClient();
  if (!stripe) return null;

  try {
    const getSubscriptionPeriodEnd = (subscription: Stripe.Subscription | undefined) => {
      const periodEnd = subscription?.items?.data?.[0]?.current_period_end;
      if (!periodEnd) return null;
      return new Date(periodEnd * 1000).toISOString();
    };

    const activeSubs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 5,
    });

    const activePeriodEnd = getSubscriptionPeriodEnd(activeSubs.data[0]);
    if (activePeriodEnd) {
      return activePeriodEnd;
    }

    const trialingSubs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "trialing",
      limit: 5,
    });

    const trialingPeriodEnd = getSubscriptionPeriodEnd(trialingSubs.data[0]);
    if (trialingPeriodEnd) {
      return trialingPeriodEnd;
    }
  } catch {
    return null;
  }

  return null;
}

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_active, subscription_period_end, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle<BillingProfile>();
  const nextChargeAt = await resolveNextChargeAt(profile ?? null);

  return (
    <BillingPageClient
      subscriptionActive={profile?.subscription_active === true}
      subscriptionTier={profile?.subscription_tier ?? null}
      nextChargeAt={nextChargeAt}
      canManageSubscription={Boolean(profile?.stripe_customer_id)}
    />
  );
}
