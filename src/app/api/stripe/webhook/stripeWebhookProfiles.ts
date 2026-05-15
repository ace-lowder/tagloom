import { STARTER_GENERATION_CREDITS, type AdminClient } from "./stripeWebhookTypes";

export async function grantSingleUseCredit(userId: string, admin: AdminClient) {
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
      single_use_credits:
        (profile.single_use_credits || 0) + STARTER_GENERATION_CREDITS,
      starter_upgrade_discount_available: true,
    })
    .eq("id", userId);
}

export async function updateStripeCustomerId(
  userId: string,
  customerId: string,
  admin: AdminClient,
) {
  if (!admin) return;
  const adminClient = admin as any;
  await adminClient
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);
}

export async function consumeStarterUpgradeDiscount(userId: string, admin: AdminClient) {
  if (!admin) return;
  const adminClient = admin as any;
  await adminClient
    .from("profiles")
    .update({ starter_upgrade_discount_available: false })
    .eq("id", userId);
}

export async function clearSubscriptionFields(userId: string, admin: AdminClient) {
  if (!admin) return;
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
}
