import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getUser: getUserMock,
    },
    from: vi.fn(),
  }),
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    subscriptions: { update: vi.fn() },
    subscriptionSchedules: { release: vi.fn(), create: vi.fn(), update: vi.fn() },
  }),
}));

vi.mock("@/lib/apiProtection", () => ({
  applyApiProtection: vi.fn(async () => ({ blocked: false })),
  jsonFromBlockedResult: vi.fn(),
}));

vi.mock("@/lib/errorLogging", () => ({
  logServerError: vi.fn(async () => undefined),
}));

vi.mock("@/lib/stripeBillingSync", () => ({
  getCanonicalSubscriptionForCustomer: vi.fn(async () => null),
  syncBillingProjectionForUser: vi.fn(),
}));

describe("billing switch plan route", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({
      data: { user: { id: "user_123", email_confirmed_at: "2026-01-01T00:00:00.000Z" } },
    });
  });

  it("returns 403 for unverified users", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "user_123", email_confirmed_at: null } },
    });

    const response = await POST(
      new Request("https://tagloom.test/api/billing/switch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTier: "yearly" }),
      }) as never,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Confirm your email to continue.",
      code: "email_not_verified",
    });
  });

  it("returns 401 for anonymous users", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
    });

    const response = await POST(
      new Request("https://tagloom.test/api/billing/switch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTier: "yearly" }),
      }) as never,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "You must be logged in." });
  });
});
