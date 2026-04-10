import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, STRIPE_METADATA_KEYS } from "@/lib/stripe";
import {
  findUserIdFromStripeCustomerId,
  syncBillingProjectionForUser,
} from "@/lib/stripeBillingSync";

async function grantSingleUseCredit(userId: string, admin: ReturnType<typeof createSupabaseAdminClient>) {
  if (!admin) return;
  const adminClient = admin as any;
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, single_use_credits")
    .eq("id", userId)
    .single();

  if (!profile) return;

  await adminClient
    .from("profiles")
    .update({ single_use_credits: (profile.single_use_credits || 0) + 1 })
    .eq("id", userId);
}

export async function POST(req: Request) {
  const stripe = getStripeClient();
  const admin = createSupabaseAdminClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !admin || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 },
    );
  }

  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook signature." },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      const customerId = typeof session.customer === "string" ? session.customer : null;

      let userId = metadata[STRIPE_METADATA_KEYS.userId] ?? null;
      if (!userId && customerId) {
        userId = await findUserIdFromStripeCustomerId(customerId);
      }

      if (!userId) {
        console.error("[stripe] checkout.session.completed missing user mapping", {
          session: session.id,
          customerId,
        });
        return NextResponse.json({ received: true });
      }

      if (customerId) {
        const adminClient = admin as any;
        await adminClient
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", userId);
      }

      const purchaseType = metadata[STRIPE_METADATA_KEYS.purchaseType];
      if (purchaseType === "single_use" && session.payment_status === "paid") {
        await grantSingleUseCredit(userId, admin);
      }

      if ((purchaseType === "monthly" || purchaseType === "yearly") && typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await syncBillingProjectionForUser({
          userId,
          customerId,
          subscription,
        });
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.resumed" ||
      event.type === "customer.subscription.paused"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata || {};
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      let userId = metadata[STRIPE_METADATA_KEYS.userId] ?? null;
      if (!userId && customerId) {
        userId = await findUserIdFromStripeCustomerId(customerId);
      }

      if (!userId) {
        console.error("[stripe] subscription event missing user mapping", {
          event: event.type,
          subscriptionId: subscription.id,
          customerId,
        });
        return NextResponse.json({ received: true });
      }

      await syncBillingProjectionForUser({
        userId,
        customerId,
        subscription,
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata || {};
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      let userId = metadata[STRIPE_METADATA_KEYS.userId] ?? null;
      if (!userId && customerId) {
        userId = await findUserIdFromStripeCustomerId(customerId);
      }

      if (!userId) {
        console.error("[stripe] subscription deleted missing user mapping", {
          subscriptionId: subscription.id,
          customerId,
        });
        return NextResponse.json({ received: true });
      }

      if (!customerId) {
        const adminClient = admin as any;
        await adminClient
          .from("profiles")
          .update({
            subscription_active: false,
            subscription_tier: null,
            subscription_period_start: null,
            subscription_period_end: null,
          })
          .eq("id", userId);
      } else {
        await syncBillingProjectionForUser({
          userId,
          customerId,
          subscription: null,
        });
      }
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as any;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const metadata = subscription.metadata || {};
        const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
        let userId = metadata[STRIPE_METADATA_KEYS.userId] ?? null;

        if (!userId && customerId) {
          userId = await findUserIdFromStripeCustomerId(customerId);
        }

        if (userId) {
          await syncBillingProjectionForUser({
            userId,
            customerId,
            subscription,
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe] webhook handling failed", error);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
