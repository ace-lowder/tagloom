import { STARTER_GENERATION_CREDITS, type AdminClient } from "./stripeWebhookTypes";

export async function grantSingleUseCredit(userId: string, admin: AdminClient) {
  if (!admin) return;
  const profiles = profilesTable(admin);
  const { data: profile } = await profiles
    .select("id, single_use_credits")
    .eq("id", userId)
    .single();

  if (!profile) return;

  await profiles
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
  await profilesTable(admin)
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);
}

export async function consumeStarterUpgradeDiscount(userId: string, admin: AdminClient) {
  if (!admin) return;
  await profilesTable(admin)
    .update({ starter_upgrade_discount_available: false })
    .eq("id", userId);
}

export async function clearSubscriptionFields(userId: string, admin: AdminClient) {
  if (!admin) return;
  await profilesTable(admin)
    .update({
      subscription_active: false,
      subscription_tier: null,
      subscription_period_start: null,
      subscription_period_end: null,
      subscription_cancel_at: null,
    })
    .eq("id", userId);
}

function profilesTable(admin: NonNullable<AdminClient>) {
  return admin.from("profiles") as unknown as ProfilesTable;
}

type ProfilesTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      single: () => Promise<{
        data: { id: string; single_use_credits: number | null } | null;
      }>;
    };
  };
  update: (values: Record<string, unknown>) => {
    eq: (column: string, value: string) => Promise<unknown>;
  };
};
