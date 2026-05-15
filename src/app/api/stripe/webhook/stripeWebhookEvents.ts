import type Stripe from "stripe";

export function getStripeEventMetadata(
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

export function constructStripeWebhookEvent(
  stripe: Stripe,
  body: string,
  signature: string,
  webhookSecret: string,
) {
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}
