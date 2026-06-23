import { NextRequest, NextResponse } from "next/server";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";
import { isEmailVerified } from "@/lib/auth";
import { logServerError } from "@/lib/errorLogging";
import { getCanonicalSubscriptionForCustomer, syncBillingProjectionForUser } from "@/lib/stripeBillingSync";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SwitchPlanBody = {
  targetTier?: "monthly" | "yearly";
};

function resolveTierFromPrice(priceId: string | null) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) return "monthly";
  if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) return "yearly";
  return null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as SwitchPlanBody;
  const targetTier = body.targetTier;
  if (!targetTier || !["monthly", "yearly"].includes(targetTier)) {
    return NextResponse.json({ error: "Invalid target tier.", code: "invalid_target_tier" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const stripe = getStripeClient();
  if (!supabase || !stripe) {
    return NextResponse.json({ error: "Billing switch is not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }
  if (!isEmailVerified(user)) {
    return NextResponse.json(
      { error: "Confirm your email to continue.", code: "email_not_verified" },
      { status: 403 },
    );
  }

  const protection = await applyApiProtection({
    route: "/api/billing/switch-plan",
    request: req,
    userId: user.id,
    rateLimits: [
      { name: "user_10_per_10m", actor: "user", limit: 10, windowMs: 600_000 },
      { name: "ip_30_per_10m", actor: "ip", limit: 30, windowMs: 600_000 },
    ],
  });
  if (protection.blocked) {
    return jsonFromBlockedResult(protection.blocked);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single<{ stripe_customer_id: string | null }>();

  if (profileError) {
    await logServerError({
      source: "api.billing.switch_plan.profile_lookup",
      route: "/api/billing/switch-plan",
      method: req.method,
      status: 500,
      userId: user.id,
      error: profileError,
      metadata: {
        stage: "profile_lookup",
        requestedTier: targetTier,
      },
    });
    return NextResponse.json(
      { error: "Could not load billing profile.", code: "profile_lookup_failed" },
      { status: 500 },
    );
  }

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found.", code: "no_billing_account" },
      { status: 400 },
    );
  }

  const canonical = await getCanonicalSubscriptionForCustomer(profile.stripe_customer_id);
  if (!canonical) {
    await logServerError({
      source: "api.billing.switch_plan.subscription_lookup",
      route: "/api/billing/switch-plan",
      method: req.method,
      status: 400,
      userId: user.id,
      error: new Error("No active subscription found"),
      metadata: {
        stage: "subscription_lookup",
        requestedTier: targetTier,
        hasStripeCustomer: Boolean(profile.stripe_customer_id),
      },
    });
    return NextResponse.json(
      { error: "No active subscription found.", code: "no_active_subscription" },
      { status: 400 },
    );
  }

  const currentItem = canonical.items.data[0];
  const currentPriceId = currentItem?.price?.id ?? null;
  const currentTier = resolveTierFromPrice(currentPriceId);

  if (!currentTier) {
    return NextResponse.json(
      { error: "Current subscription tier is not recognized.", code: "unknown_current_tier" },
      { status: 400 },
    );
  }

  if (currentTier === targetTier) {
    return NextResponse.json(
      { error: `You are already on ${targetTier}.`, code: "already_on_plan" },
      { status: 409 },
    );
  }

  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;
  if (!monthlyPriceId || !yearlyPriceId || !currentItem?.id) {
    return NextResponse.json({ error: "Missing Stripe plan configuration." }, { status: 500 });
  }

  try {
    if (currentTier === "monthly" && targetTier === "yearly") {
      if (typeof canonical.schedule === "string") {
        await stripe.subscriptionSchedules.release(canonical.schedule);
      }

      await stripe.subscriptions.update(canonical.id, {
        cancel_at: null,
        billing_cycle_anchor: "now",
        proration_behavior: "create_prorations",
        items: [{ id: currentItem.id, price: yearlyPriceId, quantity: currentItem.quantity ?? 1 }],
      });
    } else if (currentTier === "yearly" && targetTier === "monthly") {
      if (typeof canonical.schedule === "string") {
        await stripe.subscriptionSchedules.release(canonical.schedule);
      }

      const periodBoundsSource = canonical as unknown as {
        current_period_start?: number | null;
        current_period_end?: number | null;
        items?: {
          data?: Array<{
            current_period_start?: number | null;
            current_period_end?: number | null;
          }>;
        };
      };
      const phaseStart =
        periodBoundsSource.current_period_start ??
        periodBoundsSource.items?.data?.[0]?.current_period_start ??
        null;
      const phaseEnd =
        periodBoundsSource.current_period_end ??
        periodBoundsSource.items?.data?.[0]?.current_period_end ??
        null;
      const quantity = currentItem.quantity ?? 1;

      if (!phaseStart || !phaseEnd) {
        await logServerError({
          source: "api.billing.switch_plan.missing_period_bounds",
          route: "/api/billing/switch-plan",
          method: req.method,
          status: 400,
          userId: user.id,
          error: new Error("Missing subscription period bounds"),
          metadata: {
            stage: "missing_period_bounds",
            requestedTier: targetTier,
            currentTier,
            hasStripeCustomer: Boolean(profile.stripe_customer_id),
            subscriptionId: canonical.id,
            currentPeriodStart: periodBoundsSource.current_period_start ?? null,
            currentPeriodEnd: periodBoundsSource.current_period_end ?? null,
            itemCurrentPeriodStart: periodBoundsSource.items?.data?.[0]?.current_period_start ?? null,
            itemCurrentPeriodEnd: periodBoundsSource.items?.data?.[0]?.current_period_end ?? null,
          },
        });
        return NextResponse.json(
          { error: "Could not determine subscription period bounds.", code: "missing_period_bounds" },
          { status: 400 },
        );
      }

      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: canonical.id,
      });

      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: "release",
        phases: [
          {
            start_date: phaseStart,
            end_date: phaseEnd,
            items: [{ price: yearlyPriceId, quantity }],
            proration_behavior: "none",
          },
          {
            start_date: phaseEnd,
            items: [{ price: monthlyPriceId, quantity }],
            proration_behavior: "none",
          },
        ],
      });
    } else {
      return NextResponse.json(
        { error: "Unsupported plan switch.", code: "unsupported_switch" },
        { status: 400 },
      );
    }
  } catch (error) {
    await logServerError({
      source: "api.billing.switch_plan.stripe_update",
      route: "/api/billing/switch-plan",
      method: req.method,
      status: 500,
      userId: user.id,
      error,
      metadata: {
        stage: "stripe_update",
        requestedTier: targetTier,
        currentTier,
        hasStripeCustomer: Boolean(profile.stripe_customer_id),
      },
    });
    return NextResponse.json(
      { error: "Could not switch plan right now.", code: "switch_failed" },
      { status: 500 },
    );
  }

  await syncBillingProjectionForUser({
    userId: user.id,
    customerId: profile.stripe_customer_id,
  });

  return NextResponse.json({ ok: true });
}
