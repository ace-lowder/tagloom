import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const getUserMock = vi.fn();
const portalSessionCreateMock = vi.fn();
const profileMaybeSingleMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
  }),
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    billingPortal: {
      sessions: {
        create: portalSessionCreateMock,
      },
    },
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
    vi.stubEnv("STRIPE_BILLING_RETURN_URL", "https://tagloom.test/billing-return");

    getUserMock.mockReset();
    portalSessionCreateMock.mockReset();
    profileMaybeSingleMock.mockReset();
    fromMock.mockReset();

    getUserMock.mockResolvedValue({
      data: { user: { id: "user_123", email_confirmed_at: "2026-01-01T00:00:00.000Z" } },
    });
    profileMaybeSingleMock.mockResolvedValue({
      data: { stripe_customer_id: "cus_123", subscription_active: true },
      error: null,
    });

    fromMock.mockImplementation((table: string) => {
      if (table !== "profiles") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: profileMaybeSingleMock,
          })),
        })),
      };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
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

  it("returns 401 for anonymous users", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
    });

    const response = await POST(
      new Request("https://tagloom.test/api/billing/portal", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "You must be logged in." });
  });

  it("creates one billing portal session with the configured return url", async () => {
    portalSessionCreateMock.mockResolvedValueOnce({
      url: "https://billing-portal.test/session",
    });

    const response = await POST(
      new Request("https://tagloom.test/api/billing/portal", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://billing-portal.test/session",
    });
    expect(portalSessionCreateMock).toHaveBeenCalledTimes(1);
    expect(portalSessionCreateMock).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "https://tagloom.test/billing-return",
    });
  });
});
