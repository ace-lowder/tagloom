import { NextRequest, NextResponse } from "next/server";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";
import {
  needsBillingProjectionRefresh,
  syncBillingProjectionForUser,
} from "@/lib/stripeBillingSync";
import { logServerError } from "@/lib/errorLogging";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateTags, getPlaceholderTags } from "@/lib/generation";

type GenerateRequest = {
  title?: string;
  description?: string;
  generationContextId?: string;
  turnstileToken?: string;
};

type ProfileRecord = {
  id: string;
  stripe_customer_id: string | null;
  subscription_tier: "monthly" | "yearly" | null;
  subscription_active: boolean;
  subscription_period_start: string | null;
  subscription_period_end: string | null;
  subscription_cancel_at?: string | null;
  monthly_generation_count: number;
  monthly_count_period_start: string | null;
};

type EntitlementUsed =
  | "free_credit"
  | "single_use"
  | "subscription_monthly"
  | "subscription_yearly";

type EntitlementResult = {
  allowed: boolean;
  entitlement_used: EntitlementUsed | null;
  reason: string | null;
};

type InsertedGenerationRow = {
  id: string;
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

function normalizeEntitlementResult(data: EntitlementResult | EntitlementResult[] | null) {
  return Array.isArray(data) ? data[0] ?? null : data;
}

async function refundGenerationEntitlement(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  entitlementUsed: EntitlementUsed,
) {
  await supabase.rpc("refund_generation_entitlement", {
    p_user_id: userId,
    p_entitlement_used: entitlementUsed,
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
      "id, stripe_customer_id, subscription_tier, subscription_active, subscription_period_start, subscription_period_end, monthly_generation_count, monthly_count_period_start",
    )
    .eq("id", user.id)
    .single<ProfileRecord>();

  if (profileError || !rawProfile) {
    await logServerError({
      source: "api.generate.profile_load",
      route: "/api/generate",
      method: req.method,
      status: 500,
      userId: user.id,
      error: profileError ?? new Error("Profile not found"),
      metadata: {
        stage: "profile_load",
        titleLength: title.length,
        descriptionLength: description.length,
        generationContextId,
      },
    });
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

  let { data: entitlementData, error: entitlementError } = await supabase.rpc(
    "consume_generation_entitlement",
    { p_user_id: user.id },
  );
  let entitlement = normalizeEntitlementResult(entitlementData as EntitlementResult | EntitlementResult[] | null);

  if (
    (!entitlement || (!entitlement.allowed && entitlement.reason !== "monthly_limit")) &&
    profile.stripe_customer_id
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
      ({ data: entitlementData, error: entitlementError } = await supabase.rpc(
        "consume_generation_entitlement",
        { p_user_id: user.id },
      ));
      entitlement = normalizeEntitlementResult(entitlementData as EntitlementResult | EntitlementResult[] | null);
    }
  }

  if (entitlementError || !entitlement) {
    await logServerError({
      source: "api.generate.entitlement_reservation",
      route: "/api/generate",
      method: req.method,
      status: 500,
      userId: user.id,
      error: entitlementError ?? new Error("Entitlement reservation returned empty result"),
      metadata: {
        stage: "entitlement_reservation",
        titleLength: title.length,
        descriptionLength: description.length,
        generationContextId,
        hasStripeCustomer: Boolean(profile.stripe_customer_id),
        supabaseDetails: entitlementError?.details ?? null,
        supabaseHint: entitlementError?.hint ?? null,
      },
    });
    return NextResponse.json(
      { error: "Could not reserve generation entitlement." },
      { status: 500 },
    );
  }

  if (!entitlement.allowed && entitlement.reason === "monthly_limit") {
    return paywall(
      "limit_reached",
      "Monthly generation limit reached (100). Upgrade to yearly or wait for your next Stripe billing period.",
      generationContextId,
    );
  }

  if (!entitlement.allowed || !entitlement.entitlement_used) {
    return paywall(
      "payment_required",
      "You have no remaining generation credits. Purchase single use or subscribe to keep generating tags.",
      generationContextId,
    );
  }

  const entitlementUsed = entitlement.entitlement_used;

  try {
    const generated = await generateTags(title, description);

    const { data: insertedGeneration, error: insertError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        title,
        description,
        target_tags: generated.tags.target,
        discovery_tags: generated.tags.discovery,
        source: generated.source,
        entitlement_used: entitlementUsed,
      })
      .select("id")
      .single<InsertedGenerationRow>();

    if (insertError || !insertedGeneration?.id) {
      await logServerError({
        source: "api.generate.generation_insert",
        route: "/api/generate",
        method: req.method,
        status: 500,
        userId: user.id,
        error: insertError ?? new Error("Generation insert returned empty row"),
        metadata: {
          stage: "generation_insert",
          titleLength: title.length,
          descriptionLength: description.length,
          generationContextId,
          entitlementUsed,
          supabaseDetails: insertError?.details ?? null,
          supabaseHint: insertError?.hint ?? null,
        },
      });
      await refundGenerationEntitlement(supabase, user.id, entitlementUsed);
      return NextResponse.json(
        { error: "Could not save generation." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "ok",
      requestId: generationContextId,
      generationId: insertedGeneration.id,
      tags: generated.tags,
      source: generated.source,
      entitlementUsed,
    });
  } catch (error) {
    await logServerError({
      source: "api.generate.generate_tags",
      route: "/api/generate",
      method: req.method,
      status: 500,
      userId: user.id,
      error,
      metadata: {
        stage: "generate_tags",
        titleLength: title.length,
        descriptionLength: description.length,
        generationContextId,
        entitlementUsed,
      },
    });
    await refundGenerationEntitlement(supabase, user.id, entitlementUsed);
    return NextResponse.json(
      { error: "Tag generation failed." },
      { status: 500 },
    );
  }
}
