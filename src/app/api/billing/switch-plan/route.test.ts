import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCanonicalSubscriptionForCustomer,
  syncBillingProjectionForUser,
} from "@/lib/stripeBillingSync";
import { POST } from "./route";

const getUserMock = vi.fn();
const subscriptionUpdateMock = vi.fn();
const scheduleReleaseMock = vi.fn();
const scheduleCreateMock = vi.fn();
const scheduleUpdateMock = vi.fn();
const profileSingleMock = vi.fn();
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
    subscriptions: {
      update: subscriptionUpdateMock,
    },
    subscriptionSchedules: {
      release: scheduleReleaseMock,
      create: scheduleCreateMock,
      update: scheduleUpdateMock,
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

vi.mock("@/lib/stripeBillingSync", () => ({
  getCanonicalSubscriptionForCustomer: vi.fn(),
  syncBillingProjectionForUser: vi.fn(),
}));

describe("billing switch plan route", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_MONTHLY_PRICE_ID", "price_monthly");
    vi.stubEnv("STRIPE_YEARLY_PRICE_ID", "price_yearly");

    getUserMock.mockReset();
    subscriptionUpdateMock.mockReset();
    scheduleReleaseMock.mockReset();
    scheduleCreateMock.mockReset();
    scheduleUpdateMock.mockReset();
    profileSingleMock.mockReset();
    fromMock.mockReset();
    vi.mocked(getCanonicalSubscriptionForCustomer).mockReset();
    vi.mocked(syncBillingProjectionForUser).mockReset();

    getUserMock.mockResolvedValue({
      data: { user: { id: "user_123", email_confirmed_at: "2026-01-01T00:00:00.000Z" } },
    });
    profileSingleMock.mockResolvedValue({
      data: { stripe_customer_id: "cus_123" },
      error: null,
    });

    fromMock.mockImplementation((table: string) => {
      if (table !== "profiles") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: profileSingleMock,
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
      new Request("https://updatetags.test/api/billing/switch-plan", {
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
      new Request("https://updatetags.test/api/billing/switch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTier: "yearly" }),
      }) as never,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "You must be logged in." });
  });

  it("releases an existing monthly schedule, updates the yearly subscription, and refreshes billing projection", async () => {
    const canonical = {
      id: "sub_monthly",
      schedule: "sched_monthly",
      items: {
        data: [
          {
            id: "si_monthly",
            quantity: 2,
            price: { id: "price_monthly" },
          },
        ],
      },
    };
    const canonicalSubscriptionMock = vi.mocked(getCanonicalSubscriptionForCustomer);
    canonicalSubscriptionMock.mockResolvedValueOnce(canonical as never);

    const response = await POST(
      new Request("https://updatetags.test/api/billing/switch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTier: "yearly" }),
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(scheduleReleaseMock).toHaveBeenCalledWith("sched_monthly");
    expect(subscriptionUpdateMock).toHaveBeenCalledWith("sub_monthly", {
      cancel_at: null,
      billing_cycle_anchor: "now",
      proration_behavior: "create_prorations",
      items: [{ id: "si_monthly", price: "price_yearly", quantity: 2 }],
    });
    expect(scheduleCreateMock).not.toHaveBeenCalled();
    expect(scheduleUpdateMock).not.toHaveBeenCalled();
    expect(syncBillingProjectionForUser).toHaveBeenCalledWith({
      userId: "user_123",
      customerId: "cus_123",
    });
  });

  it("creates a two-phase schedule for yearly-to-monthly switches and refreshes billing projection", async () => {
    const canonical = {
      id: "sub_yearly",
      schedule: "sched_yearly",
      current_period_start: 111,
      current_period_end: 222,
      items: {
        data: [
          {
            id: "si_yearly",
            quantity: 3,
            price: { id: "price_yearly" },
          },
        ],
      },
    };
    const canonicalSubscriptionMock = vi.mocked(getCanonicalSubscriptionForCustomer);
    canonicalSubscriptionMock.mockResolvedValueOnce(canonical as never);
    scheduleCreateMock.mockResolvedValueOnce({ id: "sched_new" });

    const response = await POST(
      new Request("https://updatetags.test/api/billing/switch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTier: "monthly" }),
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(scheduleReleaseMock).toHaveBeenCalledWith("sched_yearly");
    expect(scheduleCreateMock).toHaveBeenCalledWith({
      from_subscription: "sub_yearly",
    });
    expect(scheduleUpdateMock).toHaveBeenCalledWith("sched_new", {
      end_behavior: "release",
      phases: [
        {
          start_date: 111,
          end_date: 222,
          items: [{ price: "price_yearly", quantity: 3 }],
          proration_behavior: "none",
        },
        {
          start_date: 222,
          items: [{ price: "price_monthly", quantity: 3 }],
          proration_behavior: "none",
        },
      ],
    });
    expect(subscriptionUpdateMock).not.toHaveBeenCalled();
    expect(syncBillingProjectionForUser).toHaveBeenCalledWith({
      userId: "user_123",
      customerId: "cus_123",
    });
  });
});
