import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { applyApiProtection, jsonFromBlockedResult, type RateLimitRule } from "@/lib/apiProtection";

const DEFAULT_RULE: RateLimitRule = {
  name: "ip_20_per_min",
  actor: "ip",
  limit: 20,
  windowMs: 60_000,
};

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("https://updatetags.test/api/test", {
    method: "POST",
    headers,
  });
}

describe("apiProtection", () => {
  const envBackup = {
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY,
  };

  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://upstash.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.TURNSTILE_SECRET_KEY = "secret";
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = envBackup.upstashUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = envBackup.upstashToken;
    process.env.TURNSTILE_SECRET_KEY = envBackup.turnstileSecret;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("blocks when turnstile token is missing on challenged routes", async () => {
    const result = await applyApiProtection({
      route: "/api/generate",
      request: makeRequest(),
      requireTurnstile: true,
      turnstileToken: null,
    });

    expect(result.blocked?.status).toBe(403);
    expect(result.blocked?.body.code).toBe("bot_check_failed");
  });

  it("blocks when rate limit count exceeds threshold", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            { result: 0 },
            { result: 1 },
            { result: 21 },
            { result: 1 },
          ]),
          { status: 200 },
        ),
      ),
    );

    const result = await applyApiProtection({
      route: "/api/generate",
      request: makeRequest({ "x-forwarded-for": "1.1.1.1" }),
      rateLimits: [DEFAULT_RULE],
    });

    expect(result.blocked?.status).toBe(429);
    expect(result.blocked?.body.code).toBe("rate_limited");
    expect(result.blocked?.body.rule).toBe("ip_20_per_min");
  });

  it("fails open for unavailable upstash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const result = await applyApiProtection({
      route: "/api/generate",
      request: makeRequest({ "x-forwarded-for": "1.1.1.1" }),
      rateLimits: [DEFAULT_RULE],
    });

    expect(result.blocked).toBeUndefined();
  });

  it("sets retry-after header for blocked rate limits", () => {
    const response = jsonFromBlockedResult({
      status: 429,
      body: {
        ok: false,
        code: "rate_limited",
        error: "Too many requests.",
        retryAfterMs: 60000,
        rule: "ip_20_per_min",
      },
      retryAfterSeconds: 60,
    });

    expect(response.headers.get("Retry-After")).toBe("60");
  });
});
