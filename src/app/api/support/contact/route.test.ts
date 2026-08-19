import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";
import { logServerError } from "@/lib/errorLogging";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POST } from "./route";

vi.mock("@/lib/apiProtection", () => ({
  applyApiProtection: vi.fn(async () => ({})),
  jsonFromBlockedResult: vi.fn((blocked) =>
    Response.json(blocked.body, { status: blocked.status }) as ReturnType<
      typeof jsonFromBlockedResult
    >,
  ),
}));

vi.mock("@/lib/errorLogging", () => ({
  logServerError: vi.fn(async () => undefined),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const validPayload = {
  name: "Etsy Seller",
  email: "seller@example.com",
  subject: "Need help with tags",
  message: "Can you help me understand my generated tags?",
  turnstileToken: "turnstile-token",
};

const fixedTimestamp = "2026-06-30T12:34:56.000Z";

const insertSingleMock = vi.fn();
const updateEqMock = vi.fn();
const fromMock = vi.fn();
const getUserMock = vi.fn();

function makeRequest(payload: unknown, headers: Record<string, string> = {}) {
  return new Request("https://updatetags.test/api/support/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-agent": "vitest",
      "x-forwarded-for": "203.0.113.10, 198.51.100.20",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<{ ok: boolean; error?: string }>;
}

function getResendRequestBody() {
  const call = vi.mocked(fetch).mock.calls[0];
  const init = call?.[1] as { body?: string } | undefined;

  if (!init?.body || typeof init.body !== "string") {
    throw new Error("Expected Resend request body.");
  }

  return JSON.parse(init.body) as {
    from: string;
    to: string;
    reply_to: string;
    subject: string;
    text: string;
    html?: string;
  };
}

describe("support contact route", () => {
  const envBackup = {
    resendApiKey: process.env.RESEND_API_KEY,
    supportFromEmail: process.env.SUPPORT_FROM_EMAIL,
    supportToEmail: process.env.SUPPORT_TO_EMAIL,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(fixedTimestamp));
    process.env.RESEND_API_KEY = "resend-test-key";
    process.env.SUPPORT_FROM_EMAIL = "UpdateTags Support <support@example.com>";
    process.env.SUPPORT_TO_EMAIL = "help@example.com";

    vi.mocked(applyApiProtection).mockResolvedValue({});
    vi.mocked(jsonFromBlockedResult).mockImplementation((blocked) =>
      Response.json(blocked.body, { status: blocked.status }) as ReturnType<
        typeof jsonFromBlockedResult
      >,
    );
    vi.mocked(logServerError).mockReset();

    insertSingleMock.mockReset();
    updateEqMock.mockReset();
    fromMock.mockReset();
    getUserMock.mockReset();

    insertSingleMock.mockResolvedValue({
      data: { id: "support-msg-123" },
      error: null,
    });
    updateEqMock.mockResolvedValue({ error: null });

    fromMock.mockImplementation((table: string) => {
      if (table !== "support_messages") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: insertSingleMock,
          })),
        })),
        update: vi.fn(() => ({
          eq: updateEqMock,
        })),
      };
    });

    vi.mocked(createSupabaseAdminClient).mockReturnValue({
      from: fromMock,
    } as never);

    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    vi.mocked(createSupabaseServerClient).mockReturnValue({
      auth: { getUser: getUserMock },
    } as never);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ id: "email_123" }, { status: 200 })),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = envBackup.resendApiKey;
    process.env.SUPPORT_FROM_EMAIL = envBackup.supportFromEmail;
    process.env.SUPPORT_TO_EMAIL = envBackup.supportToEmail;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("valid anonymous message persists pending, sends email, updates sent, and returns success", async () => {
    const response = await POST(makeRequest(validPayload) as never);

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ ok: true });

    expect(insertSingleMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("support_messages");

    const insertPayload =
      fromMock.mock.results[0]?.value.insert.mock.calls[0]?.[0] as Record<string, unknown>;

    expect(insertPayload).toMatchObject({
      user_id: null,
      name: validPayload.name,
      email: validPayload.email,
      subject: validPayload.subject,
      message: validPayload.message,
      status: "pending",
      email_domain: "example.com",
      ip_address: "203.0.113.10",
      user_agent: "vitest",
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    const resendBody = getResendRequestBody();
    expect(resendBody.reply_to).toBe(validPayload.email);
    expect(resendBody.text).toBe(
      [
        "New UpdateTags support message",
        "",
        `Received: ${fixedTimestamp}`,
        "From: Etsy Seller <seller@example.com>",
        "Reply-To: seller@example.com",
        "Subject: Need help with tags",
        "",
        "Message:",
        "Can you help me understand my generated tags?",
        "",
        "Request metadata:",
        "IP: 203.0.113.10",
        "User-Agent: vitest",
      ].join("\n"),
    );
    expect(resendBody.html).toContain(
      '<img src="https://updatetags.com/updatetags-email-wordmark.png" width="140" alt="UpdateTags" style="display:block;width:140px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;">',
    );
    expect(resendBody.html).toContain("Received: 2026-06-30T12:34:56.000Z");
    expect(resendBody.html).toContain("IP: 203.0.113.10");
    expect(resendBody.html).toContain("User-Agent: vitest");

    expect(updateEqMock).toHaveBeenCalledTimes(1);
    expect(updateEqMock).toHaveBeenCalledWith("id", "support-msg-123");

    const sentUpdatePayload =
      fromMock.mock.results[1]?.value.update.mock.calls[0]?.[0] as Record<string, unknown>;

    expect(sentUpdatePayload).toMatchObject({
      status: "sent",
      resend_message_id: "email_123",
      updated_at: expect.any(String),
    });
  });

  it("valid logged-in message persists with authenticated user_id", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const response = await POST(makeRequest(validPayload) as never);

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ ok: true });

    const insertPayload =
      fromMock.mock.results[0]?.value.insert.mock.calls[0]?.[0] as Record<string, unknown>;

    expect(insertPayload.user_id).toBe("user-123");
  });

  it("returns 400 for invalid payload and does not insert or send", async () => {
    const response = await POST(
      makeRequest({ ...validPayload, email: "not-an-email" }) as never,
    );

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Enter a valid email address.",
    });
    expect(insertSingleMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not insert or send when API protection blocks", async () => {
    vi.mocked(applyApiProtection).mockResolvedValue({
      blocked: {
        status: 429,
        body: {
          ok: false,
          code: "rate_limited",
          error: "Too many requests.",
          retryAfterMs: 60_000,
          rule: "ip_5_per_10m",
        },
        retryAfterSeconds: 60,
      },
    });

    const response = await POST(makeRequest(validPayload) as never);

    expect(response.status).toBe(429);
    expect(insertSingleMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("missing support email env marks message failed, logs resend failure, and returns 500", async () => {
    delete process.env.RESEND_API_KEY;

    const response = await POST(makeRequest(validPayload) as never);

    expect(response.status).toBe(500);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Could not submit your message.",
    });

    expect(insertSingleMock).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();

    const failedUpdatePayload =
      fromMock.mock.results[1]?.value.update.mock.calls[0]?.[0] as Record<string, unknown>;

    expect(failedUpdatePayload).toMatchObject({
      status: "failed",
      error_message: expect.any(String),
      updated_at: expect.any(String),
    });

    expect(logServerError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "api.support.contact.resend_send",
        metadata: expect.objectContaining({
          stage: "resend_send",
          supportMessageId: "support-msg-123",
        }),
      }),
    );
  });

  it("resend non-2xx marks message failed, logs with supportMessageId, and returns 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ message: "Nope" }, { status: 422 })),
    );

    const response = await POST(makeRequest(validPayload) as never);

    expect(response.status).toBe(500);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Could not submit your message.",
    });

    const failedUpdatePayload =
      fromMock.mock.results[1]?.value.update.mock.calls[0]?.[0] as Record<string, unknown>;

    expect(failedUpdatePayload).toMatchObject({
      status: "failed",
      error_message: expect.any(String),
      updated_at: expect.any(String),
    });

    expect(logServerError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "api.support.contact.resend_send",
        metadata: expect.objectContaining({
          stage: "resend_send",
          supportMessageId: "support-msg-123",
          emailDomain: "example.com",
        }),
      }),
    );
  });

  it("insert failure logs persist_insert, does not send email, and returns 500", async () => {
    insertSingleMock.mockResolvedValueOnce({
      data: null,
      error: { message: "insert failed" },
    });

    const response = await POST(makeRequest(validPayload) as never);

    expect(response.status).toBe(500);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Could not submit your message.",
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(logServerError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "api.support.contact.persist_insert",
      }),
    );
  });

  it("sent update failure logs persist_sent_update and still returns success", async () => {
    updateEqMock.mockResolvedValueOnce({ error: { message: "update failed" } });

    const response = await POST(makeRequest(validPayload) as never);

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ ok: true });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(logServerError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "api.support.contact.persist_sent_update",
        metadata: expect.objectContaining({ supportMessageId: "support-msg-123" }),
      }),
    );
  });

  it("escapes support email html payload values", async () => {
    const maliciousPayload = {
      name: `Ava <script>alert("name")</script>`,
      email: "ava&ops@example.com",
      subject: `Help & "Support" <urgent>`,
      message: "First line\nSecond line <b>bold</b> & 'quoted'",
      turnstileToken: "turnstile-token",
    };

    const response = await POST(
      makeRequest(maliciousPayload, {
        "x-forwarded-for": '203.0.113.10<script>alert("ip")</script>',
        "user-agent": `Agent <img src=x onerror="alert('ua')"> & test`,
      }) as never,
    );

    expect(response.status).toBe(200);

    const resendBody = getResendRequestBody();
    expect(resendBody.reply_to).toBe("ava&ops@example.com");
    expect(resendBody.html).toContain(
      "Ava &lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt; &lt;ava&amp;ops@example.com&gt;",
    );
    expect(resendBody.html).toContain("Help &amp; &quot;Support&quot; &lt;urgent&gt;");
    expect(resendBody.html).toContain(
      "First line<br>Second line &lt;b&gt;bold&lt;/b&gt; &amp; &#39;quoted&#39;",
    );
    expect(resendBody.html).toContain(
      "IP: 203.0.113.10&lt;script&gt;alert(&quot;ip&quot;)&lt;/script&gt;",
    );
    expect(resendBody.html).toContain(
      "User-Agent: Agent &lt;img src=x onerror=&quot;alert(&#39;ua&#39;)&quot;&gt; &amp; test",
    );
    expect(resendBody.html).not.toContain("<script>");
    expect(resendBody.html).not.toContain("<b>bold</b>");
    expect(resendBody.html).not.toContain('<img src=x');
  });
});
