import { NextRequest, NextResponse } from "next/server";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";
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
  subscription_tier: "monthly" | "yearly" | null;
  subscription_active: boolean;
  subscription_period_start: string | null;
  monthly_generation_count: number;
  monthly_count_period_start: string | null;
};

function paywall(reason: "auth_required" | "payment_required" | "limit_reached", message: string, requestId: string | null) {
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, free_generation_credits, single_use_credits, subscription_tier, subscription_active, subscription_period_start, monthly_generation_count, monthly_count_period_start",
    )
    .eq("id", user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Unable to load user profile. Please try again." },
      { status: 500 },
    );
  }

  let entitlementUsed: "free_credit" | "single_use" | "subscription_monthly" | "subscription_yearly" | null = null;

  const profileUpdates: Partial<ProfileRecord> = {};

  if (profile.free_generation_credits > 0) {
    entitlementUsed = "free_credit";
    profileUpdates.free_generation_credits = Math.max(0, profile.free_generation_credits - 1);
  } else if (profile.single_use_credits > 0) {
    entitlementUsed = "single_use";
    profileUpdates.single_use_credits = Math.max(0, profile.single_use_credits - 1);
  } else if (profile.subscription_active && profile.subscription_tier === "yearly") {
    entitlementUsed = "subscription_yearly";
  } else if (profile.subscription_active && profile.subscription_tier === "monthly") {
    const periodStart = profile.subscription_period_start;
    const countPeriodStart = profile.monthly_count_period_start;

    if (periodStart && countPeriodStart !== periodStart) {
      profile.monthly_generation_count = 0;
      profileUpdates.monthly_generation_count = 0;
      profileUpdates.monthly_count_period_start = periodStart;
    }

    if (profile.monthly_generation_count < 100) {
      entitlementUsed = "subscription_monthly";
      profileUpdates.monthly_generation_count = profile.monthly_generation_count + 1;
      if (!profileUpdates.monthly_count_period_start && periodStart) {
        profileUpdates.monthly_count_period_start = periodStart;
      }
    } else {
      return paywall(
        "limit_reached",
        "Monthly generation limit reached (100). Upgrade to yearly or wait for your next Stripe billing period.",
        generationContextId,
      );
    }
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
