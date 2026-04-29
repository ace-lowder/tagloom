import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncBillingProjectionForUser } from "@/lib/stripeBillingSync";
import { POST } from "./route";

const constructEventMock = vi.fn();
const fromMock = vi.fn();
const profileUpdatePayloads: unknown[] = [];
const stripeEventInsertPayloads: unknown[] = [];
const stripeEventUpdatePayloads: unknown[] = [];
const stripeEventInsertResult = {
  error: null as { code?: string; message?: string } | null,
};
const existingStripeEvent = {
  data: null as { status: "processing" | "processed" | "failed" } | null,
  error: null as { code?: string; message?: string } | null,
};

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

function mockSupabaseTables(existingCredits: number) {
  const profilesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "user_123",
            single_use_credits: existingCredits,
          },
        })),
      })),
    })),
    update: vi.fn((payload: unknown) => {
      profileUpdatePayloads.push(payload);
      return {
        eq: vi.fn(async () => ({ error: null })),
      };
    }),
  };

  const stripeEventsTable = {
    insert: vi.fn(async (payload: unknown) => {
      stripeEventInsertPayloads.push(payload);
      return stripeEventInsertResult;
    }),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => existingStripeEvent),
      })),
    })),
    update: vi.fn((payload: unknown) => {
      stripeEventUpdatePayloads.push(payload);
      return {
        eq: vi.fn(async () => ({ error: null })),
      };
    }),
  };

  fromMock.mockImplementation((table: string) => {
    if (table === "profiles") return profilesTable;
    if (table === "stripe_events") return stripeEventsTable;
    throw new Error(`Unexpected table: ${table}`);
  });
}

describe("Stripe webhook route", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    constructEventMock.mockReset();
    fromMock.mockReset();
    vi.mocked(syncBillingProjectionForUser).mockReset();
    profileUpdatePayloads.length = 0;
    stripeEventInsertPayloads.length = 0;
    stripeEventUpdatePayloads.length = 0;
    stripeEventInsertResult.error = null;
    existingStripeEvent.data = null;
    existingStripeEvent.error = null;
    mockSupabaseTables(2);
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
    expect(profileUpdatePayloads).toContainEqual({
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
    expect(profileUpdatePayloads).toEqual([]);
  });

  it("skips side effects for duplicate processed Stripe event deliveries", async () => {
    stripeEventInsertResult.error = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };
    existingStripeEvent.data = { status: "processed" };
    constructEventMock.mockReturnValue({
      id: "evt_duplicate_starter",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_duplicate_starter",
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
    expect(profileUpdatePayloads).toEqual([]);
    expect(syncBillingProjectionForUser).not.toHaveBeenCalled();
  });

  it("skips side effects for duplicate processing Stripe event deliveries", async () => {
    stripeEventInsertResult.error = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };
    existingStripeEvent.data = { status: "processing" };
    constructEventMock.mockReturnValue({
      id: "evt_processing_starter",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_processing_starter",
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
    expect(profileUpdatePayloads).toEqual([]);
    expect(syncBillingProjectionForUser).not.toHaveBeenCalled();
  });

  it("reclaims failed Stripe events and reruns side effects", async () => {
    stripeEventInsertResult.error = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };
    existingStripeEvent.data = { status: "failed" };
    constructEventMock.mockReturnValue({
      id: "evt_failed_retry_starter",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_failed_retry_starter",
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
    expect(stripeEventUpdatePayloads).toEqual([
      expect.objectContaining({
        type: "checkout.session.completed",
        status: "processing",
        processed_at: null,
        error: null,
      }),
      expect.objectContaining({
        status: "processed",
        error: null,
      }),
    ]);
    expect(profileUpdatePayloads).toContainEqual({
      single_use_credits: 7,
      starter_upgrade_discount_available: true,
    });
  });

  it("marks a successfully handled webhook event as processed", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_processed_starter",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_processed_starter",
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
    expect(stripeEventInsertPayloads).toContainEqual({
      id: "evt_processed_starter",
      type: "checkout.session.completed",
      status: "processing",
    });
    expect(stripeEventUpdatePayloads).toEqual([
      expect.objectContaining({
        status: "processed",
        error: null,
      }),
    ]);
    expect(stripeEventUpdatePayloads[0]).toHaveProperty("processed_at");
  });

  it("returns 500 when claiming a new Stripe event fails unexpectedly", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stripeEventInsertResult.error = {
      code: "PGRST000",
      message: "database unavailable",
    };
    constructEventMock.mockReturnValue({
      id: "evt_claim_error",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_claim_error",
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

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Webhook handling failed." });
    expect(profileUpdatePayloads).toEqual([]);
  });
});
