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
    billingPortal: { sessions: { create: vi.fn() } },
  }),
}));

vi.mock("@/lib/apiProtection", () => ({
  applyApiProtection: vi.fn(async () => ({ blocked: false })),
  jsonFromBlockedResult: vi.fn(),
}));

vi.mock("@/lib/errorLogging", () => ({
  logServerError: vi.fn(async () => undefined),
}));

describe("billing portal route", () => {
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
      new Request("https://tagloom.test/api/billing/portal", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Confirm your email to continue.",
      code: "email_not_verified",
    });
  });
});

