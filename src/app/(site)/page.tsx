import HomePageClient, { type HomePricingState } from "@/components/site/HomePageClient";
import { getStripeClient } from "@/lib/stripe";
import {
  getCanonicalSubscriptionForCustomer,
  syncBillingProjectionForUser,
} from "@/lib/stripeBillingSync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HomePricingProfile = {
  subscription_tier: "monthly" | "yearly" | null;
  subscription_active: boolean;
  subscription_period_start: string | null;
  monthly_generation_count: number;
  monthly_count_period_start: string | null;
  stripe_customer_id: string | null;
};

function getMonthlyRemaining(profile: HomePricingProfile | null) {
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

function resolveTierFromPriceId(priceId: string | null) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) return "monthly";
  if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) return "yearly";
  return null;
}

async function loadHomePricingState(): Promise<HomePricingState> {
  const fallback: HomePricingState = {
    isLoggedIn: false,
    currentTier: null,
    isExpiring: false,
    pendingRenewalTier: null,
    pendingRenewalAt: null,
    allowStarterPurchaseWithSubscription: true,
  };

  const supabase = createSupabaseServerClient();
  if (!supabase) return fallback;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fallback;

  const { data: initialProfile } = await supabase
    .from("profiles")
    .select(
      "subscription_tier, subscription_active, subscription_period_start, monthly_generation_count, monthly_count_period_start, stripe_customer_id",
    )
    .eq("id", user.id)
    .maybeSingle<HomePricingProfile>();

  let profile = initialProfile ?? null;
  let pendingRenewalTier: "monthly" | "yearly" | null = null;
  let pendingRenewalAt: string | null = null;

  if (profile?.stripe_customer_id) {
    const refreshed = await syncBillingProjectionForUser({
      userId: user.id,
      customerId: profile.stripe_customer_id,
    });

    if (refreshed) {
      profile = {
        subscription_tier: refreshed.subscription_tier,
        subscription_active: refreshed.subscription_active,
        subscription_period_start: refreshed.subscription_period_start,
        monthly_generation_count: profile.monthly_generation_count,
        monthly_count_period_start: profile.monthly_count_period_start,
        stripe_customer_id: refreshed.stripe_customer_id,
      };
    }

    const canonical = await getCanonicalSubscriptionForCustomer(profile.stripe_customer_id);
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
        pendingRenewalTier = nextTier;
        pendingRenewalAt = currentPhaseEnd ? new Date(currentPhaseEnd * 1000).toISOString() : null;
      }
    }
  }

  const monthlyRemaining = getMonthlyRemaining(profile);
  const allowStarterPurchaseWithSubscription =
    profile?.subscription_active && profile.subscription_tier === "yearly"
      ? false
      : profile?.subscription_active && profile.subscription_tier === "monthly"
        ? monthlyRemaining === 0
        : true;

  return {
    isLoggedIn: true,
    currentTier:
      profile?.subscription_active && profile.subscription_tier
        ? profile.subscription_tier
        : null,
    isExpiring: false,
    pendingRenewalTier,
    pendingRenewalAt,
    allowStarterPurchaseWithSubscription,
  };
}

export default async function HomePage() {
  const pricingState = await loadHomePricingState();
  return <HomePageClient pricingState={pricingState} />;
}
