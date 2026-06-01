import { NextRequest, NextResponse } from "next/server";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";
import { logServerError } from "@/lib/errorLogging";

export async function POST(req: NextRequest) {
  try {
    const disableIpLimitForPlaywright =
      process.env.PLAYWRIGHT_DISABLE_SIGNUP_IP_LIMIT === "true" &&
      process.env.NODE_ENV !== "production";
    const rateLimits = disableIpLimitForPlaywright
      ? []
      : [{ name: "ip_2_per_24h", actor: "ip" as const, limit: 2, windowMs: 86_400_000 }];

    const protection = await applyApiProtection({
      route: "/api/auth/signup-eligibility",
      request: req,
      requireTurnstile: true,
      turnstileToken: req.headers.get("x-turnstile-token"),
      rateLimits,
    });

    if (protection.blocked) {
      return jsonFromBlockedResult(protection.blocked);
    }
  } catch (error) {
    await logServerError({
      source: "api.auth.signup_eligibility.protection",
      route: "/api/auth/signup-eligibility",
      method: req.method,
      status: 500,
      error,
      metadata: {
        stage: "apply_api_protection",
      },
    });
    return NextResponse.json(
      { ok: false, error: "Could not verify signup eligibility." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
