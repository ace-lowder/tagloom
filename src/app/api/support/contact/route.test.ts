import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyApiProtection, jsonFromBlockedResult } from "@/lib/apiProtection";
import { POST } from "./route";

vi.mock("@/lib/apiProtection", () => ({
  applyApiProtection: vi.fn(async () => ({})),
  jsonFromBlockedResult: vi.fn((blocked) =>
    Response.json(blocked.body, { status: blocked.status }),
  ),
}));

const validPayload = {
  name: "Etsy Seller",
  email: "seller@example.com",
  subject: "Need help with tags",
  message: "Can you help me understand my generated tags?",
  turnstileToken: "turnstile-token",
};

function makeRequest(payload: unknown, headers: Record<string, string> = {}) {
  return new Request("https://tagloom.test/api/support/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-agent": "vitest",
      "x-forwarded-for": "203.0.113.10",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<{ ok: boolean; error?: string }>;
}

describe("support contact route", () => {
  const envBackup = {
    resendApiKey: process.env.RESEND_API_KEY,
    supportFromEmail: process.env.SUPPORT_FROM_EMAIL,
    supportToEmail: process.env.SUPPORT_TO_EMAIL,
  };

  beforeEach(() => {
    process.env.RESEND_API_KEY = "resend-test-key";
    process.env.SUPPORT_FROM_EMAIL = "Tagloom Support <support@example.com>";
    process.env.SUPPORT_TO_EMAIL = "help@example.com";
    vi.mocked(applyApiProtection).mockResolvedValue({});
    vi.mocked(jsonFromBlockedResult).mockImplementation((blocked) =>
      Response.json(blocked.body, { status: blocked.status }),
    );
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
  });

  it("sends a support email and returns success for a valid message", async () => {
    const response = await POST(makeRequest(validPayload) as never);

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ ok: true });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer resend-test-key",
          "Content-Type": "application/json",
        }),
        cache: "no-store",
      }),
    );

    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(requestInit?.body)) as {
      from: string;
      to: string;
      reply_to: string;
      subject: string;
      text: string;
    };

    expect(body.from).toBe("Tagloom Support <support@example.com>");
    expect(body.to).toBe("help@example.com");
    expect(body.reply_to).toBe(validPayload.email);
    expect(body.subject).toBe(`Tagloom support: ${validPayload.subject}`);
    expect(body.text).toContain(validPayload.email);
    expect(body.text).toContain(validPayload.subject);
    expect(body.text).toContain(validPayload.message);
    expect(body.text).toContain("Received:");
  });

  it("returns 400 and does not send for an invalid payload", async () => {
    const response = await POST(
      makeRequest({ ...validPayload, email: "not-an-email" }) as never,
    );

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Enter a valid email address.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a server error and does not send when support email env is missing", async () => {
    delete process.env.RESEND_API_KEY;

    const response = await POST(makeRequest(validPayload) as never);

    expect(response.status).toBe(500);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Could not submit your message.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a server error when Resend rejects the email", async () => {
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
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not send when API protection blocks the request", async () => {
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
    expect(fetch).not.toHaveBeenCalled();
  });
});
