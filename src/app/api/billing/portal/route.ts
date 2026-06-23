import { NextResponse } from "next/server";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";
import { isEmailVerified } from "@/lib/auth";
import { logServerError } from "@/lib/errorLogging";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

type BillingProfile = {
  stripe_customer_id: string | null;
  subscription_active: boolean;
};

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const stripe = getStripeClient();

  if (!supabase || !stripe) {
    return NextResponse.json(
      { error: "Billing portal is not configured." },
      { status: 500 },
    );
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
    route: "/api/billing/portal",
    request: req,
    userId: user.id,
    rateLimits: [{ name: "user_20_per_10m", actor: "user", limit: 20, windowMs: 600_000 }],
  });

  if (protection.blocked) {
    return jsonFromBlockedResult(protection.blocked);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id, subscription_active")
    .eq("id", user.id)
    .maybeSingle<BillingProfile>();

  if (profileError) {
    await logServerError({
      source: "api.billing.portal.profile_lookup",
      route: "/api/billing/portal",
      method: req.method,
      status: 500,
      userId: user.id,
      error: profileError,
      metadata: {
        stage: "profile_lookup",
      },
    });
    return NextResponse.json(
      { error: "Could not load billing profile." },
      { status: 500 },
    );
  }

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found for this user." },
      { status: 400 },
    );
  }

  if (!profile.subscription_active) {
    return NextResponse.json(
      { error: "No active subscription to manage." },
      { status: 400 },
    );
  }

  const requestOrigin = new URL(req.url).origin;
  const returnUrl = process.env.STRIPE_BILLING_RETURN_URL || `${requestOrigin}/billing`;

  let session;
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });
  } catch (error) {
    await logServerError({
      source: "api.billing.portal.create_session",
      route: "/api/billing/portal",
      method: req.method,
      status: 500,
      userId: user.id,
      error,
      metadata: {
        stage: "create_session",
        hasStripeCustomer: Boolean(profile.stripe_customer_id),
      },
    });
    return NextResponse.json(
      { error: "Could not open billing portal." },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: session.url });
}
