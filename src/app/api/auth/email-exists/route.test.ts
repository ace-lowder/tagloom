import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);

function makeRequest(email: string) {
  return new NextRequest("http://localhost/api/auth/email-exists", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  createSupabaseAdminClientMock.mockReset();
});

describe("auth email-exists route", () => {
  it("reports missing after paging through all users", async () => {
    const listUsersMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          users: Array.from({ length: 1000 }, (_, index) => ({
            email: `person-${index}@example.com`,
            email_confirmed_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString(),
          })),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              email: "other@example.com",
              email_confirmed_at: new Date().toISOString(),
              confirmed_at: new Date().toISOString(),
            },
          ],
        },
        error: null,
      });

    createSupabaseAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: listUsersMock,
        },
      },
    } as never);

    const response = await POST(makeRequest("  missing@example.com "));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "missing" });
    expect(listUsersMock).toHaveBeenNthCalledWith(1, { page: 1, perPage: 1000 });
    expect(listUsersMock).toHaveBeenNthCalledWith(2, { page: 2, perPage: 1000 });
  });

  it("reports unverified when the exact normalized email exists without confirmation", async () => {
    const listUsersMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          users: Array.from({ length: 1000 }, (_, index) => ({
            email: `person-${index}@example.com`,
            email_confirmed_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString(),
          })),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              email: "Person@Example.com",
              email_confirmed_at: null,
              confirmed_at: null,
            },
          ],
        },
        error: null,
      });

    createSupabaseAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: listUsersMock,
        },
      },
    } as never);

    const response = await POST(makeRequest("  PERSON@example.com "));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "unverified" });
  });

  it("reports verified when the exact normalized email exists with confirmation", async () => {
    const listUsersMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          users: Array.from({ length: 1000 }, (_, index) => ({
            email: `person-${index}@example.com`,
            email_confirmed_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString(),
          })),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              email: "person@example.com",
              email_confirmed_at: null,
              confirmed_at: new Date().toISOString(),
            },
          ],
        },
        error: null,
      });

    createSupabaseAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: listUsersMock,
        },
      },
    } as never);

    const response = await POST(makeRequest("person@example.com"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "verified" });
  });

  it("returns 500 when the admin client is unavailable", async () => {
    createSupabaseAdminClientMock.mockReturnValue(null);

    const response = await POST(makeRequest("person@example.com"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Could not check account status.",
    });
  });
});
