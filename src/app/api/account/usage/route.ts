import { NextResponse } from "next/server";
import { isEmailVerified } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  needsBillingProjectionRefresh,
  syncBillingProjectionForUser,
} from "@/lib/stripeBillingSync";

type ProfileUsageRecord = {
  id: string;
  free_generation_credits: number;
  single_use_credits: number;
  stripe_customer_id: string | null;
  subscription_tier: "monthly" | "yearly" | null;
  subscription_active: boolean;
  subscription_period_start: string | null;
  subscription_period_end: string | null;
  subscription_cancel_at?: string | null;
  monthly_generation_count: number;
  monthly_count_period_start: string | null;
};

const MONTHLY_LIMIT = 100;

function pluralize(word: string, count: number) {
  return count === 1 ? word : `${word}s`;
}

function formatUsageLabel(profile: ProfileUsageRecord): string | null {
  if (profile.subscription_active && profile.subscription_tier === "yearly") {
    return null;
  }

  if (profile.subscription_active && profile.subscription_tier === "monthly") {
    const periodStart = profile.subscription_period_start;
    const countPeriodStart = profile.monthly_count_period_start;
    const effectiveUsed =
      periodStart && countPeriodStart !== periodStart
        ? 0
        : profile.monthly_generation_count;
    const remaining = Math.max(0, MONTHLY_LIMIT - effectiveUsed);
    return `${remaining}/${MONTHLY_LIMIT} generations remaining`;
  }

  if (profile.single_use_credits > 0) {
    return `${profile.single_use_credits} starter ${pluralize("generation", profile.single_use_credits)} remaining`;
  }

  const freeRemaining = Math.max(0, profile.free_generation_credits);
  return `${freeRemaining} free ${pluralize("generation", freeRemaining)} remaining`;
}

function resolveMonthlyResetAt(profile: ProfileUsageRecord): string | null {
  if (!(profile.subscription_active && profile.subscription_tier === "monthly")) {
    return null;
  }
  return profile.subscription_period_end ?? null;
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ usageLabel: null });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ usageLabel: null });
  }

  if (!isEmailVerified(user)) {
    return NextResponse.json(
      { error: "Confirm your email to continue.", code: "email_not_verified" },
      { status: 403 },
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, free_generation_credits, single_use_credits, stripe_customer_id, subscription_tier, subscription_active, subscription_period_start, subscription_period_end, monthly_generation_count, monthly_count_period_start",
    )
    .eq("id", user.id)
    .maybeSingle<ProfileUsageRecord>();

  if (error || !profile) {
    return NextResponse.json({ usageLabel: null });
  }

  let effectiveProfile = profile;

  if (
    needsBillingProjectionRefresh({
      id: profile.id,
      stripe_customer_id: profile.stripe_customer_id,
      subscription_tier: profile.subscription_tier,
      subscription_active: profile.subscription_active,
      subscription_period_start: profile.subscription_period_start,
      subscription_period_end: profile.subscription_period_end,
      subscription_cancel_at: profile.subscription_cancel_at ?? null,
    })
  ) {
    const refreshed = await syncBillingProjectionForUser({
      userId: profile.id,
      customerId: profile.stripe_customer_id,
    });

    if (refreshed) {
      effectiveProfile = {
        ...profile,
        stripe_customer_id: refreshed.stripe_customer_id,
        subscription_tier: refreshed.subscription_tier,
        subscription_active: refreshed.subscription_active,
        subscription_period_start: refreshed.subscription_period_start,
        subscription_period_end: refreshed.subscription_period_end,
        subscription_cancel_at: refreshed.subscription_cancel_at,
      };
    }
  }

  return NextResponse.json({
    usageLabel: formatUsageLabel(effectiveProfile),
    monthlyResetAt: resolveMonthlyResetAt(effectiveProfile),
  });
}
