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
const RESEND_EMAILS_URL = "https://api.resend.com/emails";

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

function getSupportEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SUPPORT_FROM_EMAIL;
  const to = process.env.SUPPORT_TO_EMAIL;

  if (!apiKey || !from || !to) return null;
  return { apiKey, from, to };
}

function buildSupportEmailText(
  payload: SanitizedPayload,
  meta: { ip: string | null; userAgent: string | null; timestamp: string },
) {
  return [
    "New Tagloom support message",
    "",
    `Received: ${meta.timestamp}`,
    `From: ${payload.name ? `${payload.name} <${payload.email}>` : payload.email}`,
    `Reply-To: ${payload.email}`,
    `Subject: ${payload.subject}`,
    "",
    "Message:",
    payload.message,
    "",
    "Request metadata:",
    `IP: ${meta.ip ?? "Unavailable"}`,
    `User-Agent: ${meta.userAgent ?? "Unavailable"}`,
  ].join("\n");
}

async function sendSupportMessage(payload: SanitizedPayload, meta: { ip: string | null; userAgent: string | null }) {
  const config = getSupportEmailConfig();
  if (!config) {
    throw new Error("Support email is not configured.");
  }

  const timestamp = new Date().toISOString();
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: config.to,
      reply_to: payload.email,
      subject: `Tagloom support: ${payload.subject}`,
      text: buildSupportEmailText(payload, { ...meta, timestamp }),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Resend email failed with ${response.status}.`);
  }
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

  try {
    await sendSupportMessage(validation.value, {
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: req.headers.get("user-agent"),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        type: "support_contact_delivery_failed",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return NextResponse.json(
      { ok: false, error: "Could not submit your message." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
