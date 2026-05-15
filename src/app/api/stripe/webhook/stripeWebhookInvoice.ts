import type Stripe from "stripe";
import { STRIPE_METADATA_KEYS } from "@/lib/stripe";
import {
  findUserIdFromStripeCustomerId,
  syncBillingProjectionForUser,
} from "@/lib/stripeBillingSync";

export async function handleInvoiceEvent({
  event,
  stripe,
}: {
  event: Stripe.Event;
  stripe: Stripe;
}) {
  const invoice = event.data.object as any;
  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : null;

  if (!subscriptionId) return;

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
