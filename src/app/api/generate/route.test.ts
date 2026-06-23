import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyApiProtection } from "@/lib/apiProtection";
import { logServerError } from "@/lib/errorLogging";
import { generateTags } from "@/lib/generation";
import { POST } from "./route";

const getUserMock = vi.fn();
const rpcMock = vi.fn();
const fromMock = vi.fn();
const profileUpdateMock = vi.fn();
const generationInsertMock = vi.fn();
const generationInsertSelectMock = vi.fn();
const generationInsertSingleMock = vi.fn();

vi.mock("@/lib/apiProtection", () => ({
  applyApiProtection: vi.fn(async () => ({})),
  jsonFromBlockedResult: vi.fn((blocked) =>
    Response.json(blocked.body, { status: blocked.status }),
  ),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
    rpc: rpcMock,
  }),
}));

vi.mock("@/lib/stripeBillingSync", () => ({
  needsBillingProjectionRefresh: vi.fn(() => false),
  syncBillingProjectionForUser: vi.fn(),
}));

vi.mock("@/lib/generation", () => ({
  generateTags: vi.fn(),
  getPlaceholderTags: vi.fn(() => ({
    target: ["placeholder target"],
    discovery: ["placeholder discovery"],
  })),
}));

vi.mock("@/lib/errorLogging", () => ({
  logServerError: vi.fn(async () => undefined),
}));

function makeRequest() {
  return new Request("https://tagloom.test/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-turnstile-token": "turnstile-token",
    },
    body: JSON.stringify({
      title: "Silver hoop earrings",
      description: "Small handmade hoops",
      generationContextId: "ctx_123",
    }),
  });
}

function mockProfile() {
  return {
    id: "user_123",
    stripe_customer_id: null,
    subscription_tier: null,
    subscription_active: false,
    subscription_period_start: null,
    subscription_period_end: null,
    monthly_generation_count: 0,
    monthly_count_period_start: null,
  };
}

describe("generate route entitlement usage", () => {
  beforeEach(() => {
    vi.mocked(applyApiProtection).mockResolvedValue({});
    getUserMock.mockResolvedValue({
      data: { user: { id: "user_123", email_confirmed_at: "2026-01-01T00:00:00.000Z" } },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: mockProfile(), error: null })),
            })),
          })),
          update: profileUpdateMock,
        };
      }
      if (table === "generations") {
        return {
          insert: generationInsertMock,
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
    rpcMock.mockReset();
    profileUpdateMock.mockReset();
    generationInsertMock.mockReset();
    generationInsertSelectMock.mockReset();
    generationInsertSingleMock.mockReset();
    generationInsertSingleMock.mockResolvedValue({ data: { id: "gen_123" }, error: null });
    generationInsertSelectMock.mockReturnValue({ single: generationInsertSingleMock });
    generationInsertMock.mockReturnValue({ select: generationInsertSelectMock });
    vi.mocked(generateTags).mockReset();
    vi.mocked(logServerError).mockReset();
    vi.mocked(generateTags).mockResolvedValue({
      tags: {
        target: ["silver hoops"],
        discovery: ["handmade earrings"],
      },
      source: "model",
    });
  });

  it("does not call tag generation when atomic entitlement reservation is denied", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: false, entitlement_used: null, reason: "monthly_limit" }],
      error: null,
    });

    const response = await POST(makeRequest() as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        status: "paywall",
        reason: "limit_reached",
        requestId: "ctx_123",
      }),
    );
    expect(generateTags).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith("consume_generation_entitlement", {
      p_user_id: "user_123",
    });
  });

  it("records free credit entitlement from the atomic reservation", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: true, entitlement_used: "free_credit", reason: null }],
      error: null,
    });

    const response = await POST(makeRequest() as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        status: "ok",
        entitlementUsed: "free_credit",
        generationId: "gen_123",
      }),
    );
    expect(generationInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user_123",
        entitlement_used: "free_credit",
      }),
    );
    expect(profileUpdateMock).not.toHaveBeenCalled();
  });

  it("records single-use entitlement from the atomic reservation", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: true, entitlement_used: "single_use", reason: null }],
      error: null,
    });

    const response = await POST(makeRequest() as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        status: "ok",
        entitlementUsed: "single_use",
        generationId: "gen_123",
      }),
    );
    expect(generationInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entitlement_used: "single_use",
      }),
    );
    expect(profileUpdateMock).not.toHaveBeenCalled();
  });

  it("refunds reserved entitlement when tag generation fails", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: true, entitlement_used: "free_credit", reason: null }],
      error: null,
    });
    vi.mocked(generateTags).mockRejectedValueOnce(new Error("model failed"));

    const response = await POST(makeRequest() as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Tag generation failed." });
    expect(rpcMock).toHaveBeenCalledWith("refund_generation_entitlement", {
      p_user_id: "user_123",
      p_entitlement_used: "free_credit",
    });
    expect(logServerError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "api.generate.generate_tags",
      }),
    );
  });

  it("refunds reserved entitlement when generation persistence fails", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: true, entitlement_used: "single_use", reason: null }],
      error: null,
    });
    generationInsertSingleMock.mockResolvedValueOnce({
      data: null,
      error: { message: "insert failed" },
    });

    const response = await POST(makeRequest() as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Could not save generation." });
    expect(rpcMock).toHaveBeenCalledWith("refund_generation_entitlement", {
      p_user_id: "user_123",
      p_entitlement_used: "single_use",
    });
    expect(logServerError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "api.generate.generation_insert",
      }),
    );
  });

  it("returns a safe error when entitlement reservation RPC fails", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc failed" },
    });

    const response = await POST(makeRequest() as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Could not reserve generation entitlement.",
    });
    expect(generateTags).not.toHaveBeenCalled();
    expect(generationInsertMock).not.toHaveBeenCalled();
  });

  it("returns the auth paywall for anonymous users", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const response = await POST(makeRequest() as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        status: "paywall",
        reason: "auth_required",
        requestId: "ctx_123",
      }),
    );
  });

  it("returns 403 for unverified users", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "user_123", email_confirmed_at: null } },
      error: null,
    });

    const response = await POST(makeRequest() as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Confirm your email to continue.",
        code: "email_not_verified",
      }),
    );
  });
});
