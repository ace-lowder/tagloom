import type Stripe from "stripe";
import { logServerError } from "@/lib/errorLogging";
import { getStripeEventMetadata } from "./stripeWebhookEvents";
import { STRIPE_EVENT_STATUS, type AdminClient } from "./stripeWebhookTypes";

export function isDuplicateStripeEventError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code =
    "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  return code === "23505";
}

export function formatStripeEventError(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 500);
  if (!error || typeof error !== "object") {
    return String(error ?? "Unknown error").slice(0, 500);
  }
  const message =
    "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "Webhook handling failed.";
  return message.slice(0, 500);
}

export async function claimStripeEvent(admin: AdminClient, event: Stripe.Event) {
  if (!admin) return "error";
  const adminClient = admin as any;
  const { error } = await adminClient.from("stripe_events").insert({
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

export async function reclaimExistingStripeEvent(adminClient: any, event: Stripe.Event) {
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

export async function markStripeEventProcessed(admin: AdminClient, eventId: string) {
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

export async function markStripeEventFailed(
  admin: AdminClient,
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
