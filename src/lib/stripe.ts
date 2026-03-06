import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover",
  });

  return stripeClient;
}

export const STRIPE_METADATA_KEYS = {
  userId: "user_id",
  purchaseType: "purchase_type",
  generationContextId: "generation_context_id",
  appEnv: "app_env",
} as const;
