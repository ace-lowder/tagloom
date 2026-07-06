import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const getUserMock = vi.fn();
const stripeSessionCreateMock = vi.fn();
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
    checkout: {
      sessions: {
        create: stripeSessionCreateMock,
      },
    },
  }),
  STRIPE_METADATA_KEYS: {
    userId: "user_id",
    purchaseType: "purchase_type",
    appEnv: "app_env",
    generationContextId: "generation_context_id",
  },
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
}));

function makeRequest(body: unknown) {
  return Object.assign(
    new Request("https://tagloom.test/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    {
      nextUrl: new URL("https://tagloom.test/api/checkout/session"),
    },
  );
}

describe("checkout session route", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SINGLE_USE_PRICE_ID", "price_single_use");
    vi.stubEnv("STRIPE_MONTHLY_PRICE_ID", "price_monthly");
    vi.stubEnv("STRIPE_YEARLY_PRICE_ID", "price_yearly");
    vi.stubEnv("STRIPE_SUCCESS_URL", "https://tagloom.test/billing");
    vi.stubEnv("STRIPE_CANCEL_URL", "https://tagloom.test/billing");
    vi.stubEnv("NODE_ENV", "test");

    getUserMock.mockReset();
    stripeSessionCreateMock.mockReset();
    profileSingleMock.mockReset();
    fromMock.mockReset();

    getUserMock.mockResolvedValue({
      data: { user: { id: "user_123", email: "seller@example.com", email_confirmed_at: "2026-01-01T00:00:00.000Z" } },
    });

    profileSingleMock.mockResolvedValue({
      data: {
        stripe_customer_id: null,
        starter_upgrade_discount_available: false,
        subscription_tier: null,
        subscription_active: false,
      },
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
      makeRequest({ purchaseType: "single_use" }) as never,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Confirm your email to continue.",
      code: "email_not_verified",
    });
    expect(stripeSessionCreateMock).not.toHaveBeenCalled();
  });

  it("returns 401 for anonymous users", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
    });

    const response = await POST(makeRequest({ purchaseType: "single_use" }) as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "You must be logged in." });
    expect(stripeSessionCreateMock).not.toHaveBeenCalled();
  });

  it("creates a single-use payment session with generation context metadata and checkout URLs", async () => {
    profileSingleMock.mockResolvedValueOnce({
      data: {
        stripe_customer_id: null,
        starter_upgrade_discount_available: false,
        subscription_tier: null,
        subscription_active: false,
      },
      error: null,
    });
    stripeSessionCreateMock.mockResolvedValueOnce({ url: "https://stripe.test/session" });

    const response = await POST(
      makeRequest({
        purchaseType: "single_use",
        generationContextId: "gen_ctx_123",
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "https://stripe.test/session" });
    expect(stripeSessionCreateMock).toHaveBeenCalledTimes(1);

    const params = stripeSessionCreateMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params).toMatchObject({
      mode: "payment",
      success_url: "https://tagloom.test/billing?checkout=success&gen_ctx=gen_ctx_123",
      cancel_url: "https://tagloom.test/billing?checkout=cancel&gen_ctx=gen_ctx_123",
      customer_email: "seller@example.com",
      line_items: [{ price: "price_single_use", quantity: 1 }],
      metadata: {
        user_id: "user_123",
        purchase_type: "single_use",
        app_env: "test",
        generation_context_id: "gen_ctx_123",
      },
    });
    expect(params.customer).toBeUndefined();
    expect(params.payment_intent_data).toMatchObject({
      metadata: {
        user_id: "user_123",
        purchase_type: "single_use",
        app_env: "test",
        generation_context_id: "gen_ctx_123",
      },
    });
    expect(params.subscription_data).toBeUndefined();
  });

  it.each([
    ["monthly", "price_monthly"],
    ["yearly", "price_yearly"],
  ] as const)(
    "creates a %s subscription session with matching price and metadata",
    async (purchaseType, expectedPriceId) => {
      stripeSessionCreateMock.mockResolvedValueOnce({ url: "https://stripe.test/session" });

      const response = await POST(
        makeRequest({
          purchaseType,
          generationContextId: "gen_ctx_456",
        }) as never,
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ url: "https://stripe.test/session" });

      const params = stripeSessionCreateMock.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(params).toMatchObject({
        mode: "subscription",
        success_url: "https://tagloom.test/billing?checkout=success&gen_ctx=gen_ctx_456",
        cancel_url: "https://tagloom.test/billing?checkout=cancel&gen_ctx=gen_ctx_456",
        customer_email: "seller@example.com",
        line_items: [{ price: expectedPriceId, quantity: 1 }],
        metadata: {
          user_id: "user_123",
          purchase_type: purchaseType,
          app_env: "test",
          generation_context_id: "gen_ctx_456",
        },
        subscription_data: {
          metadata: {
            user_id: "user_123",
            purchase_type: purchaseType,
            app_env: "test",
            generation_context_id: "gen_ctx_456",
          },
        },
      });
      expect(params.payment_intent_data).toBeUndefined();
    },
  );
});
