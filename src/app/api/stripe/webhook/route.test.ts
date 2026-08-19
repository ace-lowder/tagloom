import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncBillingProjectionForUser } from "@/lib/stripeBillingSync";
import { POST } from "./route";

const constructEventMock = vi.fn();
const retrieveSubscriptionMock = vi.fn();
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
    subscriptions: {
      retrieve: retrieveSubscriptionMock,
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
  return new Request("https://updatetags.test/api/stripe/webhook", {
    method: "POST",
    body: JSON.stringify({ id: "evt_test" }),
  });
}

function makeSubscription({
  id,
  customer,
  metadata = {},
  priceId = "price_monthly",
  status = "active",
  schedule = null,
}: {
  id: string;
  customer: string | null;
  metadata?: Record<string, string>;
  priceId?: string;
  status?: string;
  schedule?: string | null;
}) {
  return {
    id,
    object: "subscription",
    customer,
    metadata,
    schedule,
    status,
    items: {
      data: [
        {
          id: `${id}_item`,
          quantity: 1,
          price: { id: priceId },
        },
      ],
    },
  } as never;
}

function makeInvoice(subscriptionId: string) {
  return {
    id: `in_${subscriptionId}`,
    object: "invoice",
    subscription: subscriptionId,
  } as never;
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
    retrieveSubscriptionMock.mockReset();
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

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
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

  it("stores customer, consumes discount, retrieves the subscription, and syncs the monthly lifecycle checkout", async () => {
    const subscription = makeSubscription({
      id: "sub_monthly",
      customer: "cus_monthly",
      metadata: {
        user_id: "user_123",
        purchase_type: "monthly",
        starter_upgrade_discount_applied: "true",
      },
      priceId: "price_monthly",
    });
    constructEventMock.mockReturnValue({
      id: "evt_monthly_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_monthly_checkout",
          customer: "cus_monthly",
          subscription: "sub_monthly",
          metadata: {
            user_id: "user_123",
            purchase_type: "monthly",
            starter_upgrade_discount_applied: "true",
          },
          payment_status: "paid",
        },
      },
    });
    retrieveSubscriptionMock.mockResolvedValueOnce(subscription);

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(profileUpdatePayloads).toContainEqual({
      stripe_customer_id: "cus_monthly",
    });
    expect(profileUpdatePayloads).toContainEqual({
      starter_upgrade_discount_available: false,
    });
    expect(retrieveSubscriptionMock).toHaveBeenCalledWith("sub_monthly");
    expect(syncBillingProjectionForUser).toHaveBeenCalledWith({
      userId: "user_123",
      customerId: "cus_monthly",
      subscription,
    });
    expect(stripeEventUpdatePayloads).toEqual([
      expect.objectContaining({
        status: "processed",
        error: null,
      }),
    ]);
  });

  it.each([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.resumed",
    "customer.subscription.paused",
  ] as const)(
    "syncs and processes %s events",
    async (type) => {
      const subscription = makeSubscription({
        id: `sub_${type.replaceAll(".", "_")}`,
        customer: "cus_sub",
        metadata: {
          user_id: "user_123",
        },
        priceId: "price_monthly",
      });
      constructEventMock.mockReturnValue({
        id: `evt_${type.replaceAll(".", "_")}`,
        type,
        data: {
          object: subscription,
        },
      });

      const response = await POST(makeRequest());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ received: true });
      expect(syncBillingProjectionForUser).toHaveBeenCalledWith({
        userId: "user_123",
        customerId: "cus_sub",
        subscription,
      });
      expect(stripeEventUpdatePayloads).toEqual([
        expect.objectContaining({
          status: "processed",
          error: null,
        }),
      ]);
    },
  );

  it("syncs deleted subscriptions with a null subscription payload", async () => {
    const subscription = makeSubscription({
      id: "sub_deleted",
      customer: "cus_deleted",
      metadata: {
        user_id: "user_123",
      },
      priceId: "price_yearly",
    });
    constructEventMock.mockReturnValue({
      id: "evt_deleted",
      type: "customer.subscription.deleted",
      data: {
        object: subscription,
      },
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(syncBillingProjectionForUser).toHaveBeenCalledWith({
      userId: "user_123",
      customerId: "cus_deleted",
      subscription: null,
    });
    expect(stripeEventUpdatePayloads).toEqual([
      expect.objectContaining({
        status: "processed",
        error: null,
      }),
    ]);
  });

  it.each(["invoice.paid", "invoice.payment_failed"] as const)(
    "retrieves the subscription and syncs it for %s",
    async (type) => {
      const subscription = makeSubscription({
        id: "sub_invoice",
        customer: "cus_invoice",
        metadata: {
          user_id: "user_123",
        },
        priceId: "price_yearly",
      });
      constructEventMock.mockReturnValue({
        id: `evt_${type.replaceAll(".", "_")}`,
        type,
        data: {
          object: makeInvoice("sub_invoice"),
        },
      });
      retrieveSubscriptionMock.mockResolvedValueOnce(subscription);

      const response = await POST(makeRequest());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ received: true });
      expect(retrieveSubscriptionMock).toHaveBeenCalledWith("sub_invoice");
      expect(syncBillingProjectionForUser).toHaveBeenCalledWith({
        userId: "user_123",
        customerId: "cus_invoice",
        subscription,
      });
      expect(stripeEventUpdatePayloads).toEqual([
        expect.objectContaining({
          status: "processed",
          error: null,
        }),
      ]);
    },
  );

  it("marks webhook handling as failed when billing projection sync rejects", async () => {
    const subscription = makeSubscription({
      id: "sub_failing",
      customer: "cus_failing",
      metadata: {
        user_id: "user_123",
      },
      priceId: "price_monthly",
    });
    constructEventMock.mockReturnValue({
      id: "evt_failing",
      type: "customer.subscription.updated",
      data: {
        object: subscription,
      },
    });
    vi.mocked(syncBillingProjectionForUser).mockRejectedValueOnce(
      new Error("billing projection sync failed"),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Webhook handling failed." });
    expect(stripeEventUpdatePayloads).toEqual([
      expect.objectContaining({
        status: "failed",
        error: "billing projection sync failed",
      }),
    ]);
    expect(stripeEventUpdatePayloads).not.toContainEqual(
      expect.objectContaining({
        status: "processed",
      }),
    );
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
