import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileUsageRecord = {
  free_generation_credits: number;
  single_use_credits: number;
  subscription_tier: "monthly" | "yearly" | null;
  subscription_active: boolean;
  subscription_period_start: string | null;
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "free_generation_credits, single_use_credits, subscription_tier, subscription_active, subscription_period_start, monthly_generation_count, monthly_count_period_start",
    )
    .eq("id", user.id)
    .maybeSingle<ProfileUsageRecord>();

  if (error || !profile) {
    return NextResponse.json({ usageLabel: null });
  }

  return NextResponse.json({
    usageLabel: formatUsageLabel(profile),
  });
}
