import { NextRequest, NextResponse } from "next/server";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CheckEmailBody = {
  email?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  const protection = await applyApiProtection({
    route: "/api/auth/email-exists",
    request: req,
    rateLimits: [{ name: "ip_20_per_10m", actor: "ip", limit: 20, windowMs: 600_000 }],
  });

  if (protection.blocked) {
    return jsonFromBlockedResult(protection.blocked);
  }

  const body = (await req.json().catch(() => ({}))) as CheckEmailBody;
  const email = normalizeEmail(String(body.email ?? ""));

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ exists: false });
  }

  let page = 1;
  const perPage = 1000;

  // Small apps can safely page through auth users to check exact email match.
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return NextResponse.json({ error: "Could not check account status." }, { status: 500 });
    }

    const users = data.users ?? [];
    const found = users.some((user) => normalizeEmail(user.email ?? "") === email);
    if (found) {
      return NextResponse.json({ exists: true });
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return NextResponse.json({ exists: false });
}
