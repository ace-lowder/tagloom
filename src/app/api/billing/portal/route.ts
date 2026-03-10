import { NextResponse } from "next/server";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, subscription_active")
    .eq("id", user.id)
    .maybeSingle<BillingProfile>();

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

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: session.url });
}
