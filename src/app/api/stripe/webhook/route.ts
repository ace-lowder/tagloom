import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { logServerError } from "@/lib/errorLogging";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";
import { handleCheckoutSessionCompleted } from "./stripeWebhookCheckout";
import {
  constructStripeWebhookEvent,
  getStripeEventMetadata,
} from "./stripeWebhookEvents";
import { handleInvoiceEvent } from "./stripeWebhookInvoice";
import {
  claimStripeEvent,
  markStripeEventFailed,
  markStripeEventProcessed,
} from "./stripeWebhookIdempotency";
import {
  handleSubscriptionDeletedEvent,
  handleSubscriptionUpsertEvent,
} from "./stripeWebhookSubscription";

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
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let event;
  try {
    event = constructStripeWebhookEvent(stripe, body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid webhook signature.",
      },
      { status: 400 },
    );
  }

  const claim = await claimStripeEvent(admin, event);
  if (claim === "duplicate") {
    return NextResponse.json({ received: true });
  }
  if (claim === "error") {
    await logServerError({
      source: "api.stripe.webhook.claim_event",
      route: "/api/stripe/webhook",
      method: req.method,
      status: 500,
      error: new Error("Failed to claim stripe event"),
      metadata: getStripeEventMetadata(event, { stage: "claim_event" }),
    });
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const result = await handleCheckoutSessionCompleted({
        event,
        stripe,
        admin,
        method: req.method,
      });
      if (result.handledMissingUser) {
        return NextResponse.json({ received: true });
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.resumed" ||
      event.type === "customer.subscription.paused"
    ) {
      const result = await handleSubscriptionUpsertEvent({
        event,
        admin,
        method: req.method,
      });
      if (result.handledMissingUser) {
        return NextResponse.json({ received: true });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const result = await handleSubscriptionDeletedEvent({
        event,
        admin,
        method: req.method,
      });
      if (result.handledMissingUser) {
        return NextResponse.json({ received: true });
      }
    }

    if (
      event.type === "invoice.paid" ||
      event.type === "invoice.payment_failed"
    ) {
      await handleInvoiceEvent({
        event,
        stripe,
      });
    }

    await markStripeEventProcessed(admin, event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    await logServerError({
      source: "api.stripe.webhook.handler",
      route: "/api/stripe/webhook",
      method: req.method,
      status: 500,
      error,
      metadata: getStripeEventMetadata(event, { stage: "handle_event" }),
    });
    await markStripeEventFailed(admin, event.id, error);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
