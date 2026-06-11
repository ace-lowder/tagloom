import type Stripe from "stripe";
import { logServerError } from "@/lib/errorLogging";
import { STRIPE_METADATA_KEYS } from "@/lib/stripe";
import {
  findUserIdFromStripeCustomerId,
  syncBillingProjectionForUser,
} from "@/lib/stripeBillingSync";
import { getStripeEventMetadata } from "./stripeWebhookEvents";
import { markStripeEventProcessed } from "./stripeWebhookIdempotency";
import { clearSubscriptionFields } from "./stripeWebhookProfiles";
import type { AdminClient } from "./stripeWebhookTypes";

export async function handleSubscriptionUpsertEvent({
  event,
  admin,
  method,
}: {
  event: Stripe.Event;
  admin: AdminClient;
  method: string;
}) {
  const subscription = event.data.object as Stripe.Subscription;
  const metadata = subscription.metadata || {};
  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

  let userId: string | null = metadata[STRIPE_METADATA_KEYS.userId] ?? null;
  if (!userId && customerId) {
    userId = await findUserIdFromStripeCustomerId(customerId);
  }

  if (!userId) {
    await logServerError({
      source: "api.stripe.webhook.subscription_missing_user",
      route: "/api/stripe/webhook",
      method,
      status: 200,
      error: new Error("subscription event missing user mapping"),
      metadata: getStripeEventMetadata(event, {
        stage: "subscription_user_mapping",
        subscriptionId: subscription.id,
        customerId,
      }),
    });
    await markStripeEventProcessed(admin, event.id);
    return { handledMissingUser: true };
  }

  await syncBillingProjectionForUser({
    userId,
    customerId,
    subscription,
  });

  return { handledMissingUser: false };
}

export async function handleSubscriptionDeletedEvent({
  event,
  admin,
  method,
}: {
  event: Stripe.Event;
  admin: AdminClient;
  method: string;
}) {
  const subscription = event.data.object as Stripe.Subscription;
  const metadata = subscription.metadata || {};
  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

  let userId: string | null = metadata[STRIPE_METADATA_KEYS.userId] ?? null;
  if (!userId && customerId) {
    userId = await findUserIdFromStripeCustomerId(customerId);
  }

  if (!userId) {
    await logServerError({
      source: "api.stripe.webhook.subscription_deleted_missing_user",
      route: "/api/stripe/webhook",
      method,
      status: 200,
      error: new Error("subscription deleted missing user mapping"),
      metadata: getStripeEventMetadata(event, {
        stage: "subscription_deleted_user_mapping",
        subscriptionId: subscription.id,
        customerId,
      }),
    });
    await markStripeEventProcessed(admin, event.id);
    return { handledMissingUser: true };
  }

  if (!customerId) {
    await clearSubscriptionFields(userId, admin);
  } else {
    await syncBillingProjectionForUser({
      userId,
      customerId,
      subscription: null,
    });
  }

  return { handledMissingUser: false };
}
