import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const getUserMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
  }),
}));

vi.mock("@/lib/stripeBillingSync", () => ({
  needsBillingProjectionRefresh: vi.fn(() => false),
  syncBillingProjectionForUser: vi.fn(),
}));

describe("account usage route", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    fromMock.mockReset();
    getUserMock.mockResolvedValue({
      data: { user: { id: "user_123", email_confirmed_at: "2026-01-01T00:00:00.000Z" } },
    });
  });

  it("returns 403 for unverified users", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "user_123", email_confirmed_at: null } },
    });

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Confirm your email to continue.",
      code: "email_not_verified",
    });
  });

  it("returns the anonymous usage response", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ usageLabel: null });
  });
});
