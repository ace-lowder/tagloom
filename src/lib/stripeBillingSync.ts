import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";

export type BillingProjectionProfile = {
  id: string;
  stripe_customer_id: string | null;
  subscription_tier: "monthly" | "yearly" | null;
  subscription_active: boolean;
  subscription_period_start: string | null;
  subscription_period_end: string | null;
  subscription_cancel_at: string | null;
};

type BillingProjectionUpdate = {
  stripe_customer_id: string | null;
  subscription_tier: "monthly" | "yearly" | null;
  subscription_active: boolean;
  subscription_period_start: string | null;
  subscription_period_end: string | null;
  subscription_cancel_at: string | null;
};

type ActiveSubscriptionCandidate = {
  subscription: Stripe.Subscription;
  tier: "monthly" | "yearly" | null;
};

function toTimestamp(value?: number | null) {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function isMissingCancelAtColumnError(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : "";
  return message.includes("subscription_cancel_at");
}

function isSubscriptionStatusActive(status: string) {
  return status === "active" || status === "trialing";
}

function resolveTierFromSubscription(subscription: Stripe.Subscription) {
  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;
  const priceId = subscription.items.data[0]?.price?.id ?? null;

  if (priceId === monthlyPriceId) return "monthly";
  if (priceId === yearlyPriceId) return "yearly";
  return null;
}

function chooseCanonicalSubscription(
  candidates: ActiveSubscriptionCandidate[],
): Stripe.Subscription | null {
  if (!candidates.length) return null;

  const score = (tier: "monthly" | "yearly" | null) => {
    if (tier === "yearly") return 2;
    if (tier === "monthly") return 1;
    return 0;
  };

  const sorted = [...candidates].sort((a, b) => {
    const tierDiff = score(b.tier) - score(a.tier);
    if (tierDiff !== 0) return tierDiff;
    return b.subscription.created - a.subscription.created;
  });

  return sorted[0]?.subscription ?? null;
}

function buildProjectionUpdate(
  customerId: string | null,
  subscription: Stripe.Subscription | null,
): BillingProjectionUpdate {
  if (!subscription) {
    return {
      stripe_customer_id: customerId,
      subscription_tier: null,
      subscription_active: false,
      subscription_period_start: null,
      subscription_period_end: null,
      subscription_cancel_at: null,
    };
  }

  const sub = subscription as unknown as {
    current_period_start?: number | null;
    current_period_end?: number | null;
    items?: {
      data?: Array<{
        current_period_start?: number | null;
        current_period_end?: number | null;
      }>;
    };
  };

  const itemPeriodStart = sub.items?.data?.[0]?.current_period_start ?? null;
  const itemPeriodEnd = sub.items?.data?.[0]?.current_period_end ?? null;
  const periodStart = sub.current_period_start ?? itemPeriodStart;
  const periodEnd = sub.current_period_end ?? itemPeriodEnd;
  const cancelAt = subscription.cancel_at ?? null;

  return {
    stripe_customer_id: customerId,
    subscription_tier: resolveTierFromSubscription(subscription),
    subscription_active: isSubscriptionStatusActive(subscription.status),
    subscription_period_start: toTimestamp(periodStart),
    subscription_period_end: toTimestamp(periodEnd),
    subscription_cancel_at: toTimestamp(cancelAt),
  };
}

export function needsBillingProjectionRefresh(profile: BillingProjectionProfile | null) {
  if (!profile || !profile.stripe_customer_id) return false;

  const tier = profile.subscription_tier;
  const isActive = profile.subscription_active;
  const hasStart = Boolean(profile.subscription_period_start);
  const hasEnd = Boolean(profile.subscription_period_end);
  const hasCancelAt = Boolean(profile.subscription_cancel_at);

  if (isActive && !tier) return true;
  if (!isActive && tier) return true;
  if (!isActive && hasCancelAt) return true;
  if (isActive && hasCancelAt) return true;
  if (isActive && (!hasStart || !hasEnd)) return true;

  if (isActive && hasEnd) {
    const end = new Date(profile.subscription_period_end as string).getTime();
    if (!Number.isNaN(end) && end < Date.now()) {
      return true;
    }
  }

  return false;
}

export async function findUserIdFromStripeCustomerId(customerId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const adminClient = admin as any;

  const { data } = await adminClient
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.id ?? null;
}

async function getCurrentStripeSubscription(customerId: string) {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const activeSubs = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 5,
  });
  const trialingSubs = await stripe.subscriptions.list({
    customer: customerId,
    status: "trialing",
    limit: 5,
  });

  const merged = [...activeSubs.data, ...trialingSubs.data];
  const candidates: ActiveSubscriptionCandidate[] = merged.map((subscription) => ({
    subscription,
    tier: resolveTierFromSubscription(subscription),
  }));

  return chooseCanonicalSubscription(candidates);
}

export async function getCanonicalSubscriptionForCustomer(customerId: string) {
  return getCurrentStripeSubscription(customerId);
}

export async function syncBillingProjectionForUser(options: {
  userId: string;
  customerId?: string | null;
  subscription?: Stripe.Subscription | null;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const adminClient = admin as any;

  let customerId = options.customerId ?? null;
  if (!customerId) {
    const { data: rawProfile } = await adminClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", options.userId)
      .maybeSingle();
    const profile = rawProfile as { stripe_customer_id: string | null } | null;
    customerId = profile?.stripe_customer_id ?? null;
  }

  if (!customerId) return null;

  const subscription = await getCurrentStripeSubscription(customerId);

  const update = buildProjectionUpdate(customerId, subscription ?? null);
  const { error: updateError } = await adminClient
    .from("profiles")
    .update(update)
    .eq("id", options.userId);
  if (updateError && isMissingCancelAtColumnError(updateError)) {
    const { subscription_cancel_at: _ignored, ...legacyUpdate } = update;
    await adminClient.from("profiles").update(legacyUpdate).eq("id", options.userId);
  }

  const { data: rawRefreshed, error: refreshedError } = await adminClient
    .from("profiles")
    .select(
      "id, stripe_customer_id, subscription_tier, subscription_active, subscription_period_start, subscription_period_end, subscription_cancel_at",
    )
    .eq("id", options.userId)
    .maybeSingle();
  const refreshed = rawRefreshed as BillingProjectionProfile | null;
  if (refreshedError && isMissingCancelAtColumnError(refreshedError)) {
    const { data: rawLegacyRefreshed } = await adminClient
      .from("profiles")
      .select(
        "id, stripe_customer_id, subscription_tier, subscription_active, subscription_period_start, subscription_period_end",
      )
      .eq("id", options.userId)
      .maybeSingle();
    const legacyRefreshed = rawLegacyRefreshed as
      | Omit<BillingProjectionProfile, "subscription_cancel_at">
      | null;

    return legacyRefreshed
      ? { ...legacyRefreshed, subscription_cancel_at: null }
      : null;
  }

  return refreshed ?? null;
}
