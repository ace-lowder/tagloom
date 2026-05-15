import type Stripe from "stripe";
import { logServerError } from "@/lib/errorLogging";
import { STRIPE_METADATA_KEYS } from "@/lib/stripe";
import {
  findUserIdFromStripeCustomerId,
  syncBillingProjectionForUser,
} from "@/lib/stripeBillingSync";
import { getStripeEventMetadata } from "./stripeWebhookEvents";
import { markStripeEventProcessed } from "./stripeWebhookIdempotency";
import {
  consumeStarterUpgradeDiscount,
  grantSingleUseCredit,
  updateStripeCustomerId,
} from "./stripeWebhookProfiles";
import type { AdminClient } from "./stripeWebhookTypes";

export async function handleCheckoutSessionCompleted({
  event,
  stripe,
  admin,
  method,
}: {
  event: Stripe.Event;
  stripe: Stripe;
  admin: AdminClient;
  method: string;
}) {
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
      method,
      status: 200,
      error: new Error("checkout.session.completed missing user mapping"),
      metadata: getStripeEventMetadata(event, {
        stage: "checkout_user_mapping",
        sessionId: session.id,
        customerId,
      }),
    });
    await markStripeEventProcessed(admin, event.id);
    return { handledMissingUser: true };
  }

  if (customerId) {
    await updateStripeCustomerId(userId, customerId, admin);
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
    await consumeStarterUpgradeDiscount(userId, admin);
  }

  if (
    (purchaseType === "monthly" || purchaseType === "yearly") &&
    typeof session.subscription === "string"
  ) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    await syncBillingProjectionForUser({
      userId,
      customerId,
      subscription,
    });
  }

  return { handledMissingUser: false };
}
