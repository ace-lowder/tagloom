import { redirect } from "next/navigation";
import BillingPageClient from "@/components/billing/BillingPageClient";
import {
  getCanonicalSubscriptionForCustomer,
  syncBillingProjectionForUser,
} from "@/lib/stripeBillingSync";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BillingProfile = {
  subscription_tier: "monthly" | "yearly" | null;
  subscription_active: boolean;
  subscription_period_start: string | null;
  subscription_period_end: string | null;
  subscription_cancel_at?: string | null;
  free_generation_credits: number;
  single_use_credits: number;
  monthly_generation_count: number;
  monthly_count_period_start: string | null;
  stripe_customer_id: string | null;
};

type PendingRenewal = {
  tier: "monthly" | "yearly";
  renewsAt: string | null;
};

function resolveTierFromPriceId(priceId: string | null) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) return "monthly";
  if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) return "yearly";
  return null;
}

function formatGenerationsSummary(
  profile: BillingProfile | null,
  singleUseConsumedCount: number,
) {
  if (!profile) return null;

  if (profile.subscription_active && profile.subscription_tier === "yearly") {
    return "unlimited";
  }

  if (profile.subscription_active && profile.subscription_tier === "monthly") {
    const used =
      profile.subscription_period_start &&
      profile.monthly_count_period_start !== profile.subscription_period_start
        ? 0
        : profile.monthly_generation_count;
    const remaining = Math.max(0, 100 - used);
    return `${remaining}/100 generations`;
  }

  if (profile.single_use_credits > 0) {
    const totalStarterGenerations = profile.single_use_credits + Math.max(0, singleUseConsumedCount);
    const starterPacksBought = Math.max(1, Math.ceil(totalStarterGenerations / 5));
    const capacity = starterPacksBought * 5;
    return `${profile.single_use_credits}/${capacity} generations`;
  }

  const freeRemaining = Math.max(0, profile.free_generation_credits ?? 0);
  if (freeRemaining > 0) {
    const noun = freeRemaining === 1 ? "generation" : "generations";
    return `${freeRemaining} free ${noun} available`;
  }

  return null;
}

function getMonthlyRemaining(profile: BillingProfile | null) {
  if (!(profile?.subscription_active && profile.subscription_tier === "monthly")) {
    return null;
  }

  const used =
    profile.subscription_period_start &&
    profile.monthly_count_period_start !== profile.subscription_period_start
      ? 0
      : profile.monthly_generation_count;

  return Math.max(0, 100 - used);
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

  const { data: initialProfile } = await supabase
    .from("profiles")
    .select(
      "subscription_tier, subscription_active, subscription_period_start, subscription_period_end, subscription_cancel_at, free_generation_credits, single_use_credits, monthly_generation_count, monthly_count_period_start, stripe_customer_id",
    )
    .eq("id", user.id)
    .maybeSingle<BillingProfile>();

  const { count: singleUseConsumedCount } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("entitlement_used", "single_use");

  let profile = initialProfile ?? null;
  let pendingRenewal: PendingRenewal | null = null;
  const customerId = profile?.stripe_customer_id;
  if (profile && customerId) {
    const currentProfile = profile;
    const refreshed = await syncBillingProjectionForUser({
      userId: user.id,
      customerId,
    });
    if (refreshed) {
      profile = {
        subscription_tier: refreshed.subscription_tier,
        subscription_active: refreshed.subscription_active,
        subscription_period_start: refreshed.subscription_period_start,
        subscription_period_end: refreshed.subscription_period_end,
        subscription_cancel_at: refreshed.subscription_cancel_at,
        free_generation_credits: currentProfile.free_generation_credits,
        single_use_credits: currentProfile.single_use_credits,
        monthly_generation_count: currentProfile.monthly_generation_count,
        monthly_count_period_start: currentProfile.monthly_count_period_start,
        stripe_customer_id: refreshed.stripe_customer_id,
      };
    }

    const canonical = await getCanonicalSubscriptionForCustomer(customerId);
    const scheduleId = typeof canonical?.schedule === "string" ? canonical.schedule : null;
    const stripe = getStripeClient();
    if (scheduleId && stripe) {
      const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
      const phases = schedule.phases ?? [];
      const currentPhaseEnd = schedule.current_phase?.end_date ?? null;
      const nextPhase = phases.find((phase) => {
        const phaseStart = phase.start_date ?? null;
        return Boolean(currentPhaseEnd && phaseStart && phaseStart >= currentPhaseEnd);
      });
      const nextPrice = nextPhase?.items?.[0]?.price ?? null;
      const nextPriceId =
        typeof nextPrice === "string"
          ? nextPrice
          : (nextPrice as { id?: string | null } | null)?.id ?? null;
      const currentTier = profile.subscription_tier;
      const nextTier = resolveTierFromPriceId(nextPriceId);
      if (
        currentTier &&
        nextTier &&
        nextTier !== currentTier &&
        (nextTier === "monthly" || nextTier === "yearly")
      ) {
        pendingRenewal = {
          tier: nextTier,
          renewsAt: currentPhaseEnd ? new Date(currentPhaseEnd * 1000).toISOString() : null,
        };
      }
    }
  }

  const isExpiring =
    profile?.subscription_active === true && Boolean(profile.subscription_cancel_at);
  const monthlyRemaining = getMonthlyRemaining(profile);
  const allowStarterPurchaseWithSubscription =
    profile?.subscription_active && profile.subscription_tier === "yearly"
      ? false
      : profile?.subscription_active && profile.subscription_tier === "monthly"
        ? monthlyRemaining === 0
        : true;
  const billingDateAt = isExpiring
    ? (profile?.subscription_cancel_at ?? profile?.subscription_period_end ?? null)
    : (profile?.subscription_period_end ?? null);
  const generationsSummary = formatGenerationsSummary(
    profile,
    singleUseConsumedCount ?? 0,
  );

  return (
    <BillingPageClient
      subscriptionActive={profile?.subscription_active === true}
      subscriptionTier={profile?.subscription_tier ?? null}
      billingDateAt={billingDateAt}
      isExpiring={isExpiring}
      generationsSummary={generationsSummary}
      canManageSubscription={Boolean(profile?.stripe_customer_id)}
      allowStarterPurchaseWithSubscription={allowStarterPurchaseWithSubscription}
      pendingRenewalTier={pendingRenewal?.tier ?? null}
      pendingRenewalAt={pendingRenewal?.renewsAt ?? null}
    />
  );
}
