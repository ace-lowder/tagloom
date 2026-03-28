import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient, STRIPE_METADATA_KEYS } from "@/lib/stripe";

type CheckoutBody = {
  purchaseType?: "single_use" | "monthly" | "yearly";
  generationContextId?: string;
};

function appendParams(urlString: string, params: Record<string, string | null | undefined>) {
  const url = new URL(urlString);
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as CheckoutBody;
  const purchaseType = body.purchaseType;
  const generationContextId = body.generationContextId ?? null;

  if (!purchaseType || !["single_use", "monthly", "yearly"].includes(purchaseType)) {
    return NextResponse.json({ error: "Invalid purchase type." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const stripe = getStripeClient();

  if (!supabase || !stripe) {
    return NextResponse.json(
      { error: "Checkout is not configured. Missing Supabase or Stripe environment variables." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const protection = await applyApiProtection({
    route: "/api/checkout/session",
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

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single<{ stripe_customer_id: string | null }>();

  const successUrlBase = process.env.STRIPE_SUCCESS_URL || `${req.nextUrl.origin}/`;
  const cancelUrlBase = process.env.STRIPE_CANCEL_URL || `${req.nextUrl.origin}/`;

  const successUrl = appendParams(successUrlBase, {
    checkout: "success",
    gen_ctx: generationContextId,
  });

  const cancelUrl = appendParams(cancelUrlBase, {
    checkout: "cancel",
    gen_ctx: generationContextId,
  });

  const metadata: Record<string, string> = {
    [STRIPE_METADATA_KEYS.userId]: user.id,
    [STRIPE_METADATA_KEYS.purchaseType]: purchaseType,
    [STRIPE_METADATA_KEYS.appEnv]: process.env.NODE_ENV || "development",
  };

  if (generationContextId) {
    metadata[STRIPE_METADATA_KEYS.generationContextId] = generationContextId;
  }

  const singleUsePriceId = process.env.STRIPE_SINGLE_USE_PRICE_ID;
  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;

  const lineItemPriceId =
    purchaseType === "single_use"
      ? singleUsePriceId
      : purchaseType === "monthly"
        ? monthlyPriceId
        : yearlyPriceId;

  if (!lineItemPriceId) {
    return NextResponse.json(
      { error: `Missing Stripe price id for ${purchaseType}.` },
      { status: 500 },
    );
  }

  const baseParams: Stripe.Checkout.SessionCreateParams = {
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [{ price: lineItemPriceId, quantity: 1 }],
    metadata,
    customer: profile?.stripe_customer_id ?? undefined,
    customer_email: profile?.stripe_customer_id ? undefined : user.email ?? undefined,
  };

  const session =
    purchaseType === "single_use"
      ? await stripe.checkout.sessions.create({
          ...baseParams,
          mode: "payment",
          payment_intent_data: {
            metadata,
          },
        })
      : await stripe.checkout.sessions.create({
          ...baseParams,
          mode: "subscription",
          subscription_data: {
            metadata,
          },
        });

  return NextResponse.json({ url: session.url });
}
