import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const constructEventMock = vi.fn();
const fromMock = vi.fn();
const updatePayloads: unknown[] = [];

vi.mock("next/headers", () => ({
  headers: () => ({
    get: (name: string) => (name === "stripe-signature" ? "test-signature" : null),
  }),
}));

vi.mock("@/lib/stripe", () => ({
  STRIPE_METADATA_KEYS: {
    userId: "user_id",
    purchaseType: "purchase_type",
    generationContextId: "generation_context_id",
    appEnv: "app_env",
  },
  getStripeClient: () => ({
    webhooks: {
      constructEvent: constructEventMock,
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: fromMock,
  }),
}));

vi.mock("@/lib/stripeBillingSync", () => ({
  findUserIdFromStripeCustomerId: vi.fn(),
  syncBillingProjectionForUser: vi.fn(),
}));

function makeRequest() {
  return new Request("https://tagloom.test/api/stripe/webhook", {
    method: "POST",
    body: JSON.stringify({ id: "evt_test" }),
  });
}

function mockProfilesTable(existingCredits: number) {
  const eqAfterSelect = vi.fn(() => ({
    single: vi.fn(async () => ({
      data: {
        id: "user_123",
        single_use_credits: existingCredits,
      },
    })),
  }));
  const eqAfterUpdate = vi.fn(async () => ({ error: null }));

  fromMock.mockReturnValue({
    select: vi.fn(() => ({
      eq: eqAfterSelect,
    })),
    update: vi.fn((payload: unknown) => {
      updatePayloads.push(payload);
      return {
        eq: eqAfterUpdate,
      };
    }),
  });
}

describe("Stripe webhook route", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    constructEventMock.mockReset();
    fromMock.mockReset();
    updatePayloads.length = 0;
    mockProfilesTable(2);
  });

  it("grants 5 starter credits for a paid single-use checkout", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_paid_starter",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_paid_starter",
          customer: null,
          metadata: {
            user_id: "user_123",
            purchase_type: "single_use",
          },
          payment_status: "paid",
        },
      },
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(updatePayloads).toContainEqual({
      single_use_credits: 7,
      starter_upgrade_discount_available: true,
    });
  });

  it("does not grant starter credits for an unpaid single-use checkout", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_unpaid_starter",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_unpaid_starter",
          customer: null,
          metadata: {
            user_id: "user_123",
            purchase_type: "single_use",
          },
          payment_status: "unpaid",
        },
      },
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(updatePayloads).toEqual([]);
  });
});
