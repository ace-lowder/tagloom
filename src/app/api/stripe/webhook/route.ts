import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { logServerError } from "@/lib/errorLogging";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, STRIPE_METADATA_KEYS } from "@/lib/stripe";
import {
  findUserIdFromStripeCustomerId,
  syncBillingProjectionForUser,
} from "@/lib/stripeBillingSync";

const STARTER_GENERATION_CREDITS = 5;
const STRIPE_EVENT_STATUS = {
  processing: "processing",
  processed: "processed",
  failed: "failed",
} as const;

function getStripeEventMetadata(
  event: Stripe.Event,
  extras: Record<string, unknown> = {},
) {
  return {
    stage: extras.stage ?? null,
    eventId: event.id,
    eventType: event.type,
    ...extras,
  };
}

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
    .update({
      single_use_credits: (profile.single_use_credits || 0) + STARTER_GENERATION_CREDITS,
      starter_upgrade_discount_available: true,
    })
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
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      const customerId = typeof session.customer === "string" ? session.customer : null;

      let userId = metadata[STRIPE_METADATA_KEYS.userId] ?? null;
      if (!userId && customerId) {
        userId = await findUserIdFromStripeCustomerId(customerId);
      }

      if (!userId) {
        await logServerError({
          source: "api.stripe.webhook.checkout_missing_user",
          route: "/api/stripe/webhook",
          method: req.method,
          status: 200,
          error: new Error("checkout.session.completed missing user mapping"),
          metadata: getStripeEventMetadata(event, {
            stage: "checkout_user_mapping",
            sessionId: session.id,
            customerId,
          }),
        });
        await markStripeEventProcessed(admin, event.id);
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

      const shouldConsumeStarterDiscount =
        (purchaseType === "monthly" || purchaseType === "yearly") &&
        metadata.starter_upgrade_discount_applied === "true" &&
        session.payment_status === "paid";
      if (shouldConsumeStarterDiscount) {
        const adminClient = admin as any;
        await adminClient
          .from("profiles")
          .update({ starter_upgrade_discount_available: false })
          .eq("id", userId);
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
        await logServerError({
          source: "api.stripe.webhook.subscription_missing_user",
          route: "/api/stripe/webhook",
          method: req.method,
          status: 200,
          error: new Error("subscription event missing user mapping"),
          metadata: getStripeEventMetadata(event, {
            stage: "subscription_user_mapping",
            subscriptionId: subscription.id,
            customerId,
          }),
        });
        await markStripeEventProcessed(admin, event.id);
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
        await logServerError({
          source: "api.stripe.webhook.subscription_deleted_missing_user",
          route: "/api/stripe/webhook",
          method: req.method,
          status: 200,
          error: new Error("subscription deleted missing user mapping"),
          metadata: getStripeEventMetadata(event, {
            stage: "subscription_deleted_user_mapping",
            subscriptionId: subscription.id,
            customerId,
          }),
        });
        await markStripeEventProcessed(admin, event.id);
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
            subscription_cancel_at: null,
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

// Stripe event idempotency
function isDuplicateStripeEventError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  return code === "23505";
}

function formatStripeEventError(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 500);
  if (!error || typeof error !== "object") return String(error ?? "Unknown error").slice(0, 500);
  const message =
    "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "Webhook handling failed.";
  return message.slice(0, 500);
}

async function claimStripeEvent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  event: Stripe.Event,
) {
  if (!admin) return "error";
  const adminClient = admin as any;
  const { error } = await adminClient
    .from("stripe_events")
    .insert({
      id: event.id,
      type: event.type,
      status: STRIPE_EVENT_STATUS.processing,
    });

  if (!error) return "claimed";
  if (isDuplicateStripeEventError(error)) {
    return reclaimExistingStripeEvent(adminClient, event);
  }

  await logServerError({
    source: "api.stripe.webhook.claim_insert_error",
    route: "/api/stripe/webhook",
    status: 500,
    error,
    metadata: getStripeEventMetadata(event, { stage: "claim_insert" }),
  });
  return "error";
}

async function reclaimExistingStripeEvent(adminClient: any, event: Stripe.Event) {
  const { data: existing, error: readError } = await adminClient
    .from("stripe_events")
    .select("status")
    .eq("id", event.id)
    .maybeSingle();

  if (readError || !existing) {
    await logServerError({
      source: "api.stripe.webhook.reclaim_lookup_error",
      route: "/api/stripe/webhook",
      status: 500,
      error: readError ?? new Error("Stripe event reclaim lookup returned no row"),
      metadata: getStripeEventMetadata(event, { stage: "reclaim_lookup" }),
    });
    return "error";
  }

  if (existing.status === STRIPE_EVENT_STATUS.failed) {
    const { error: updateError } = await adminClient
      .from("stripe_events")
      .update({
        type: event.type,
        status: STRIPE_EVENT_STATUS.processing,
        processed_at: null,
        updated_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", event.id);

    if (updateError) {
      await logServerError({
        source: "api.stripe.webhook.reclaim_update_error",
        route: "/api/stripe/webhook",
        status: 500,
        error: updateError,
        metadata: getStripeEventMetadata(event, { stage: "reclaim_update" }),
      });
      return "error";
    }

    return "claimed";
  }

  return "duplicate";
}

async function markStripeEventProcessed(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
) {
  if (!admin) return;
  const adminClient = admin as any;
  const { error } = await adminClient
    .from("stripe_events")
    .update({
      status: STRIPE_EVENT_STATUS.processed,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: null,
    })
    .eq("id", eventId);
  if (error) {
    await logServerError({
      source: "api.stripe.webhook.mark_processed_error",
      route: "/api/stripe/webhook",
      status: 500,
      error,
      metadata: {
        stage: "mark_processed",
        eventId,
      },
    });
  }
}

async function markStripeEventFailed(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
  error: unknown,
) {
  if (!admin) return;
  const adminClient = admin as any;
  const { error: updateError } = await adminClient
    .from("stripe_events")
    .update({
      status: STRIPE_EVENT_STATUS.failed,
      updated_at: new Date().toISOString(),
      error: formatStripeEventError(error),
    })
    .eq("id", eventId);
  if (updateError) {
    await logServerError({
      source: "api.stripe.webhook.mark_failed_error",
      route: "/api/stripe/webhook",
      status: 500,
      error: updateError,
      metadata: {
        stage: "mark_failed",
        eventId,
      },
    });
  }
}
