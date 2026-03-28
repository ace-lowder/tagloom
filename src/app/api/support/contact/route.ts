import { NextRequest, NextResponse } from "next/server";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";

type ContactPayload = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  turnstileToken?: string;
};

type SanitizedPayload = {
  name: string | null;
  email: string;
  subject: string;
  message: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 4000;

function sanitizeInput(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function validatePayload(payload: ContactPayload): { ok: true; value: SanitizedPayload } | { ok: false; error: string } {
  const name = sanitizeInput(payload.name);
  const email = sanitizeInput(payload.email).toLowerCase();
  const subject = sanitizeInput(payload.subject);
  const message = String(payload.message ?? "").trim();

  if (!email) return { ok: false, error: "Email is required." };
  if (!EMAIL_REGEX.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!subject) return { ok: false, error: "Subject is required." };
  if (!message) return { ok: false, error: "Message is required." };

  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    return { ok: false, error: `Email must be ${MAX_EMAIL_LENGTH} characters or fewer.` };
  }
  if (subject.length > MAX_SUBJECT_LENGTH) {
    return { ok: false, error: `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.` };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` };
  }

  return {
    ok: true,
    value: {
      name: name || null,
      email,
      subject,
      message,
    },
  };
}

async function sendSupportMessage(payload: SanitizedPayload, meta: { ip: string | null; userAgent: string | null }) {
  console.log(
    JSON.stringify({
      type: "support_contact_message",
      timestamp: new Date().toISOString(),
      payload,
      meta,
    }),
  );
}

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => ({}))) as ContactPayload;
  const turnstileToken =
    req.headers.get("x-turnstile-token") || payload.turnstileToken || null;

  const protection = await applyApiProtection({
    route: "/api/support/contact",
    request: req,
    requireTurnstile: true,
    turnstileToken,
    rateLimits: [{ name: "ip_5_per_10m", actor: "ip", limit: 5, windowMs: 600_000 }],
  });

  if (protection.blocked) {
    return jsonFromBlockedResult(protection.blocked);
  }

  const validation = validatePayload(payload);

  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  await sendSupportMessage(validation.value, {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true });
}
