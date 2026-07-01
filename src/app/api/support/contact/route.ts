import { NextRequest, NextResponse } from "next/server";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";
import { logServerError } from "@/lib/errorLogging";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => ({}))) as ContactPayload;
  const turnstileToken =
    req.headers.get("x-turnstile-token") || payload.turnstileToken || null;

  const protection = await applyApiProtection({
    route: "/api/support/contact",
    request: req,
    requireTurnstile: true,
    turnstileToken,
    rateLimits: [
      { name: "ip_5_per_10m", actor: "ip", limit: 5, windowMs: 600_000 },
    ],
  });

  if (protection.blocked) {
    return jsonFromBlockedResult(protection.blocked);
  }

  const validation = validatePayload(payload);

  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const meta = getRequestMeta(req);
  const userId = await getOptionalUserId();
  const admin = createSupabaseAdminClient();

  if (!admin) {
    await logServerError({
      source: "api.support.contact.persist_admin_missing",
      route: "/api/support/contact",
      method: req.method,
      status: 500,
      error: new Error("Supabase admin client unavailable."),
      userId,
      metadata: {
        stage: "persist_admin_missing",
        emailDomain: getEmailDomain(validation.value.email),
      },
    });
    return NextResponse.json(
      { ok: false, error: "Could not submit your message." },
      { status: 500 },
    );
  }

  const insertedSupportMessage = await insertSupportMessage(admin, {
    user_id: userId,
    name: validation.value.name,
    email: validation.value.email,
    subject: validation.value.subject,
    message: validation.value.message,
    status: "pending",
    email_domain: getEmailDomain(validation.value.email),
    ip_address: meta.ip,
    user_agent: meta.userAgent,
  });

  if (!insertedSupportMessage.ok) {
    await logServerError({
      source: "api.support.contact.persist_insert",
      route: "/api/support/contact",
      method: req.method,
      status: 500,
      error: insertedSupportMessage.error ?? new Error("Support message insert failed."),
      userId,
      metadata: {
        stage: "persist_insert",
        emailDomain: getEmailDomain(validation.value.email),
      },
    });
    return NextResponse.json(
      { ok: false, error: "Could not submit your message." },
      { status: 500 },
    );
  }

  const supportMessageId = insertedSupportMessage.id;

  try {
    const resendMessageId = await sendSupportMessage(validation.value, meta);
    const sentUpdate = await updateSupportMessageStatus(admin, supportMessageId, {
      status: "sent",
      resend_message_id: resendMessageId,
    });

    if (sentUpdate.error) {
      await logServerError({
        source: "api.support.contact.persist_sent_update",
        route: "/api/support/contact",
        method: req.method,
        status: 500,
        error: sentUpdate.error,
        userId,
        metadata: {
          stage: "persist_sent_update",
          supportMessageId,
        },
      });
    }
  } catch (error) {
    const normalizedErrorMessage = truncateErrorMessage(
      error instanceof Error ? error.message : String(error),
    );
    await updateSupportMessageStatus(admin, supportMessageId, {
      status: "failed",
      error_message: normalizedErrorMessage,
    });

    await logServerError({
      source: "api.support.contact.resend_send",
      route: "/api/support/contact",
      method: req.method,
      status: 500,
      error,
      userId,
      metadata: {
        stage: "resend_send",
        supportMessageId,
        emailDomain: getEmailDomain(validation.value.email),
        subjectLength: validation.value.subject.length,
        messageLength: validation.value.message.length,
        hasName: Boolean(validation.value.name),
      },
    });
    return NextResponse.json(
      { ok: false, error: "Could not submit your message." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

// === Types ===

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

type SupportAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type SupportMessageInsert = {
  user_id: string | null;
  name: string | null;
  email: string;
  subject: string;
  message: string;
  status: "pending";
  email_domain: string | null;
  ip_address: string | null;
  user_agent: string | null;
};

// === Constants ===

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_ERROR_MESSAGE_LENGTH = 1000;
const RESEND_EMAILS_URL = "https://api.resend.com/emails";

// === Helpers ===

function sanitizeInput(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function validatePayload(
  payload: ContactPayload,
): { ok: true; value: SanitizedPayload } | { ok: false; error: string } {
  const name = sanitizeInput(payload.name);
  const email = sanitizeInput(payload.email).toLowerCase();
  const subject = sanitizeInput(payload.subject);
  const message = String(payload.message ?? "").trim();

  if (!email) return { ok: false, error: "Email is required." };
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!subject) return { ok: false, error: "Subject is required." };
  if (!message) return { ok: false, error: "Message is required." };

  if (name.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    };
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    return {
      ok: false,
      error: `Email must be ${MAX_EMAIL_LENGTH} characters or fewer.`,
    };
  }
  if (subject.length > MAX_SUBJECT_LENGTH) {
    return {
      ok: false,
      error: `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.`,
    };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    };
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

function getEmailDomain(email: string) {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) return null;
  return email.slice(atIndex + 1).toLowerCase();
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

function buildSupportEmailHtml(
  payload: SanitizedPayload,
  meta: { ip: string | null; userAgent: string | null; timestamp: string },
) {
  const escapedMessage = escapeHtml(payload.message).replace(/\n/g, "<br>");
  const fromValue = payload.name
    ? `${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;`
    : escapeHtml(payload.email);

  return [
    '<div style="margin:0;padding:0;background:#f7f5f2;width:100%;">',
    '  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;margin:0;padding:32px 0;background:#f7f5f2;">',
    "    <tr>",
    '      <td align="center" style="padding:0 16px;">',
    '        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #eadfd3;border-radius:20px;border-collapse:separate;">',
    '          <tr><td style="padding:32px 32px 24px 32px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">',
    '            <img src="https://tagloom.app/tagloom-email-wordmark.png" width="140" alt="Tagloom" style="display:block;width:140px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;">',
    '            <div style="height:18px;line-height:18px;font-size:18px;">&nbsp;</div>',
    '            <div style="font-size:24px;line-height:1.2;font-weight:700;color:#111827;">New support message</div>',
    '            <div style="height:24px;line-height:24px;font-size:24px;">&nbsp;</div>',
    '            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;border-collapse:collapse;font-size:15px;line-height:1.6;color:#374151;">',
    "              <tr>",
    '                <td style="padding:0 0 12px 0;font-weight:700;color:#6b7280;width:92px;vertical-align:top;">From</td>',
    `                <td style="padding:0 0 12px 0;color:#111827;">${fromValue}</td>`,
    "              </tr>",
    "              <tr>",
    '                <td style="padding:0 0 12px 0;font-weight:700;color:#6b7280;vertical-align:top;">Subject</td>',
    `                <td style="padding:0 0 12px 0;color:#111827;">${escapeHtml(payload.subject)}</td>`,
    "              </tr>",
    "              <tr>",
    '                <td style="padding:0 0 12px 0;font-weight:700;color:#6b7280;vertical-align:top;">Message</td>',
    '                <td style="padding:0 0 12px 0;">',
    '                  <div style="border:1px solid #e7dfd6;border-radius:14px;background:#faf8f5;padding:16px;color:#111827;white-space:normal;word-break:break-word;">',
    `                    ${escapedMessage}`,
    "                  </div>",
    "                </td>",
    "              </tr>",
    "            </table>",
    '            <div style="height:20px;line-height:20px;font-size:20px;">&nbsp;</div>',
    '            <div style="font-size:12px;line-height:1.6;color:#6b7280;">',
    `              Received: ${escapeHtml(meta.timestamp)}<br>`,
    `              IP: ${escapeHtml(meta.ip ?? "Unavailable")}<br>`,
    `              User-Agent: ${escapeHtml(meta.userAgent ?? "Unavailable")}`,
    "            </div>",
    "          </td></tr>",
    "        </table>",
    "      </td>",
    "    </tr>",
    "  </table>",
    "</div>",
  ].join("");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendSupportMessage(
  payload: SanitizedPayload,
  meta: { ip: string | null; userAgent: string | null },
) {
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
      html: buildSupportEmailHtml(payload, { ...meta, timestamp }),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Resend email failed with ${response.status}.`);
  }

  const json = (await response.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  return typeof json?.id === "string" ? json.id : null;
}

function truncateErrorMessage(message: string) {
  return message.length > MAX_ERROR_MESSAGE_LENGTH
    ? message.slice(0, MAX_ERROR_MESSAGE_LENGTH)
    : message;
}

function getRequestMeta(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent"),
  };
}

async function getOptionalUserId() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) return null;

  return data.user?.id ?? null;
}

async function insertSupportMessage(
  admin: SupportAdminClient,
  supportMessage: SupportMessageInsert,
) {
  const { data, error } = await (
    admin.from("support_messages") as ReturnType<SupportAdminClient["from"]> & {
      insert: (
        values: SupportMessageInsert,
      ) => {
        select: (columns: string) => {
          single: () => Promise<{ data: { id: string } | null; error: unknown }>;
        };
      };
    }
  )
    .insert(supportMessage)
    .select("id")
    .single();

  if (error || !data?.id) return { ok: false as const, error };
  return { ok: true as const, id: data.id };
}

async function updateSupportMessageStatus(
  admin: SupportAdminClient,
  supportMessageId: string,
  patch: {
    status: "sent" | "failed";
    resend_message_id?: string | null;
    error_message?: string | null;
  },
) {
  const { error } = await (
    admin.from("support_messages") as ReturnType<SupportAdminClient["from"]> & {
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: string) => Promise<{ error: unknown }>;
      };
    }
  )
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", supportMessageId);

  return { error };
}
