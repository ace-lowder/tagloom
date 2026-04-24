import { NextRequest, NextResponse } from "next/server";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";

export async function POST(req: NextRequest) {
  const protection = await applyApiProtection({
    route: "/api/auth/signup-eligibility",
    request: req,
    requireTurnstile: true,
    turnstileToken: req.headers.get("x-turnstile-token"),
    rateLimits: [
      { name: "ip_2_per_24h", actor: "ip", limit: 2, windowMs: 86_400_000 },
    ],
  });

  if (protection.blocked) {
    return jsonFromBlockedResult(protection.blocked);
  }

  return NextResponse.json({ ok: true });
}
