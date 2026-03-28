import { NextResponse } from "next/server";

type RateLimitActor = "ip" | "user";

export type RateLimitRule = {
  name: string;
  actor: RateLimitActor;
  limit: number;
  windowMs: number;
};

type ProtectionOptions = {
  route: string;
  request: Request;
  userId?: string | null;
  turnstileToken?: string | null;
  requireTurnstile?: boolean;
  rateLimits?: RateLimitRule[];
};

type BlockedResult = {
  status: 403 | 429;
  body: {
    ok: false;
    code: "bot_check_failed" | "rate_limited";
    error: string;
    retryAfterMs?: number;
    rule?: string;
  };
  retryAfterSeconds?: number;
};

type GuardResult = {
  blocked?: BlockedResult;
};

type UpstashPipelineResult = Array<{ result?: unknown; error?: string }>;

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function getEnvConfig() {
  return {
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL || "",
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY || "",
  };
}

function logProtectionEvent(event: Record<string, unknown>) {
  console.warn(
    JSON.stringify({
      type: "api_protection",
      timestamp: new Date().toISOString(),
      ...event,
    }),
  );
}

async function runUpstashPipeline(
  upstashUrl: string,
  upstashToken: string,
  commands: Array<Array<string>>,
): Promise<UpstashPipelineResult> {
  const response = await fetch(`${upstashUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash pipeline failed with ${response.status}`);
  }

  const data = (await response.json()) as UpstashPipelineResult;
  return data;
}

async function checkRateLimit(
  key: string,
  rule: RateLimitRule,
  upstashUrl: string,
  upstashToken: string,
) {
  const now = Date.now();
  const windowStart = now - rule.windowMs;
  const member = `${now}:${Math.random().toString(36).slice(2, 9)}`;
  const ttlMs = rule.windowMs + 60_000;

  const commands = [
    ["ZREMRANGEBYSCORE", key, "-inf", String(windowStart)],
    ["ZADD", key, String(now), member],
    ["ZCARD", key],
    ["PEXPIRE", key, String(ttlMs)],
  ];

  const results = await runUpstashPipeline(upstashUrl, upstashToken, commands);
  const countResult = results[2];
  if (!countResult || countResult.error) {
    throw new Error("Upstash did not return a usable count result.");
  }

  const count = Number(countResult.result || 0);
  return {
    limited: count > rule.limit,
    retryAfterMs: rule.windowMs,
  };
}

async function verifyTurnstileToken(
  token: string,
  secret: string,
  ip: string,
) {
  const payload = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  });

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Turnstile verify failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    success?: boolean;
    "error-codes"?: string[];
  };

  return {
    ok: data.success === true,
    errorCodes: data["error-codes"] || [],
  };
}

export async function applyApiProtection({
  route,
  request,
  userId,
  turnstileToken,
  requireTurnstile = false,
  rateLimits = [],
}: ProtectionOptions): Promise<GuardResult> {
  const ip = getRequestIp(request);
  const { upstashUrl, upstashToken, turnstileSecret } = getEnvConfig();

  if (requireTurnstile) {
    if (!turnstileSecret) {
      logProtectionEvent({
        route,
        mode: "fail_open",
        guard: "turnstile",
        reason: "missing_turnstile_secret",
      });
    } else if (!turnstileToken) {
      logProtectionEvent({
        route,
        mode: "blocked",
        guard: "turnstile",
        reason: "missing_token",
        ip,
      });
      return {
        blocked: {
          status: 403,
          body: {
            ok: false,
            code: "bot_check_failed",
            error: "Please complete the bot check and try again.",
          },
        },
      };
    } else {
      try {
        const verification = await verifyTurnstileToken(
          turnstileToken,
          turnstileSecret,
          ip,
        );
        if (!verification.ok) {
          logProtectionEvent({
            route,
            mode: "blocked",
            guard: "turnstile",
            reason: "verification_failed",
            ip,
            errorCodes: verification.errorCodes,
          });
          return {
            blocked: {
              status: 403,
              body: {
                ok: false,
                code: "bot_check_failed",
                error: "Bot verification failed. Please try again.",
              },
            },
          };
        }
      } catch (error) {
        logProtectionEvent({
          route,
          mode: "fail_open",
          guard: "turnstile",
          reason: "verification_unavailable",
          ip,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }

  if (rateLimits.length > 0) {
    if (!upstashUrl || !upstashToken) {
      logProtectionEvent({
        route,
        mode: "fail_open",
        guard: "rate_limit",
        reason: "missing_upstash_config",
      });
    } else {
      for (const rule of rateLimits) {
        const actorValue = rule.actor === "ip" ? ip : userId || null;
        if (!actorValue) continue;

        const key = `ratelimit:${route}:${rule.name}:${rule.actor}:${actorValue}`;

        try {
          const result = await checkRateLimit(
            key,
            rule,
            upstashUrl,
            upstashToken,
          );

          if (result.limited) {
            logProtectionEvent({
              route,
              mode: "blocked",
              guard: "rate_limit",
              rule: rule.name,
              actor: rule.actor,
              actorValue,
              retryAfterMs: result.retryAfterMs,
            });
            return {
              blocked: {
                status: 429,
                body: {
                  ok: false,
                  code: "rate_limited",
                  error: "Too many requests. Please try again shortly.",
                  retryAfterMs: result.retryAfterMs,
                  rule: rule.name,
                },
                retryAfterSeconds: Math.ceil(result.retryAfterMs / 1000),
              },
            };
          }
        } catch (error) {
          logProtectionEvent({
            route,
            mode: "fail_open",
            guard: "rate_limit",
            reason: "upstash_unavailable",
            rule: rule.name,
            actor: rule.actor,
            error: error instanceof Error ? error.message : "unknown",
          });
        }
      }
    }
  }

  return {};
}

export function jsonFromBlockedResult(blocked: BlockedResult) {
  const response = NextResponse.json(blocked.body, { status: blocked.status });
  if (blocked.retryAfterSeconds) {
    response.headers.set("Retry-After", String(blocked.retryAfterSeconds));
  }
  return response;
}
