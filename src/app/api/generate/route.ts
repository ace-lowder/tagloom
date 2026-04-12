import { NextRequest, NextResponse } from "next/server";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";
import {
  needsBillingProjectionRefresh,
  syncBillingProjectionForUser,
} from "@/lib/stripeBillingSync";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateTags, getPlaceholderTags } from "@/lib/tag-generation";

type GenerateRequest = {
  title?: string;
  description?: string;
  generationContextId?: string;
  turnstileToken?: string;
};

type ProfileRecord = {
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

function paywall(
  reason: "auth_required" | "payment_required" | "limit_reached",
  message: string,
  requestId: string | null,
) {
  return NextResponse.json({
    status: "paywall",
    reason,
    requestId,
    message,
    placeholders: getPlaceholderTags(),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as GenerateRequest;
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const generationContextId = body.generationContextId ?? null;
  const turnstileToken =
    req.headers.get("x-turnstile-token") || body.turnstileToken || null;

  const preAuthProtection = await applyApiProtection({
    route: "/api/generate",
    request: req,
    requireTurnstile: true,
    turnstileToken,
    rateLimits: [{ name: "ip_20_per_min", actor: "ip", limit: 20, windowMs: 60_000 }],
  });

  if (preAuthProtection.blocked) {
    return jsonFromBlockedResult(preAuthProtection.blocked);
  }

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Auth is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
      { status: 500 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return paywall(
      "auth_required",
      "Create an account or log in to unlock this generation. New accounts get 1 free generation.",
      generationContextId,
    );
  }

  const userProtection = await applyApiProtection({
    route: "/api/generate",
    request: req,
    userId: user.id,
    rateLimits: [
      { name: "user_30_per_min", actor: "user", limit: 30, windowMs: 60_000 },
      { name: "user_300_per_day", actor: "user", limit: 300, windowMs: 86_400_000 },
    ],
  });

  if (userProtection.blocked) {
    return jsonFromBlockedResult(userProtection.blocked);
  }

  const { data: rawProfile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, free_generation_credits, single_use_credits, stripe_customer_id, subscription_tier, subscription_active, subscription_period_start, subscription_period_end, monthly_generation_count, monthly_count_period_start",
    )
    .eq("id", user.id)
    .single<ProfileRecord>();

  if (profileError || !rawProfile) {
    return NextResponse.json(
      { error: "Unable to load user profile. Please try again." },
      { status: 500 },
    );
  }

  let profile = rawProfile;

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
      profile = {
        ...profile,
        subscription_tier: refreshed.subscription_tier,
        subscription_active: refreshed.subscription_active,
        subscription_period_start: refreshed.subscription_period_start,
        subscription_period_end: refreshed.subscription_period_end,
        subscription_cancel_at: refreshed.subscription_cancel_at,
        stripe_customer_id: refreshed.stripe_customer_id,
      };
    }
  }

  const resolveEntitlement = (inputProfile: ProfileRecord) => {
    const mutableProfile: ProfileRecord = { ...inputProfile };
    const updates: Partial<ProfileRecord> = {};
    let used:
      | "free_credit"
      | "single_use"
      | "subscription_monthly"
      | "subscription_yearly"
      | null = null;

    if (mutableProfile.free_generation_credits > 0) {
      used = "free_credit";
      updates.free_generation_credits = Math.max(
        0,
        mutableProfile.free_generation_credits - 1,
      );
      return { used, updates, limitReached: false };
    }

    if (mutableProfile.single_use_credits > 0) {
      used = "single_use";
      updates.single_use_credits = Math.max(
        0,
        mutableProfile.single_use_credits - 1,
      );
      return { used, updates, limitReached: false };
    }

    if (mutableProfile.subscription_active && mutableProfile.subscription_tier === "yearly") {
      used = "subscription_yearly";
      return { used, updates, limitReached: false };
    }

    if (mutableProfile.subscription_active && mutableProfile.subscription_tier === "monthly") {
      const periodStart = mutableProfile.subscription_period_start;
      const countPeriodStart = mutableProfile.monthly_count_period_start;

      if (periodStart && countPeriodStart !== periodStart) {
        mutableProfile.monthly_generation_count = 0;
        updates.monthly_generation_count = 0;
        updates.monthly_count_period_start = periodStart;
      }

      if (mutableProfile.monthly_generation_count < 100) {
        used = "subscription_monthly";
        updates.monthly_generation_count = mutableProfile.monthly_generation_count + 1;
        if (!updates.monthly_count_period_start && periodStart) {
          updates.monthly_count_period_start = periodStart;
        }
        return { used, updates, limitReached: false };
      }

      return { used: null, updates, limitReached: true };
    }

    return { used, updates, limitReached: false };
  };

  let { used: entitlementUsed, updates: profileUpdates, limitReached } =
    resolveEntitlement(profile);

  if (!entitlementUsed && !limitReached && profile.stripe_customer_id) {
    const refreshed = await syncBillingProjectionForUser({
      userId: profile.id,
      customerId: profile.stripe_customer_id,
    });
    if (refreshed) {
      profile = {
        ...profile,
        subscription_tier: refreshed.subscription_tier,
        subscription_active: refreshed.subscription_active,
        subscription_period_start: refreshed.subscription_period_start,
        subscription_period_end: refreshed.subscription_period_end,
        subscription_cancel_at: refreshed.subscription_cancel_at,
        stripe_customer_id: refreshed.stripe_customer_id,
      };
      ({ used: entitlementUsed, updates: profileUpdates, limitReached } =
        resolveEntitlement(profile));
    }
  }

  if (limitReached) {
    return paywall(
      "limit_reached",
      "Monthly generation limit reached (100). Upgrade to yearly or wait for your next Stripe billing period.",
      generationContextId,
    );
  }

  if (!entitlementUsed) {
    return paywall(
      "payment_required",
      "You have no remaining generation credits. Purchase single use or subscribe to keep generating tags.",
      generationContextId,
    );
  }

  try {
    const generated = await generateTags(title, description);

    if (Object.keys(profileUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", user.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Could not update usage credits." },
          { status: 500 },
        );
      }
    }

    const { error: insertError } = await supabase.from("generations").insert({
      user_id: user.id,
      title,
      description,
      target_tags: generated.tags.target,
      discovery_tags: generated.tags.discovery,
      source: generated.source,
      entitlement_used: entitlementUsed,
    });

    if (insertError) {
      return NextResponse.json(
        { error: "Could not save generation." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "ok",
      requestId: generationContextId,
      tags: generated.tags,
      source: generated.source,
      entitlementUsed,
    });
  } catch {
    return NextResponse.json(
      { error: "Tag generation failed." },
      { status: 500 },
    );
  }
}
