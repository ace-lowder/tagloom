import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const exchangeCodeForSessionMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
    },
  }),
}));

function makeRequest(url: string) {
  return new Request(url);
}

describe("auth callback route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    exchangeCodeForSessionMock.mockReset();
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
  });

  it("redirects successful callbacks to the configured site URL", async () => {
    const response = await GET(
      makeRequest(
        "http://0.0.0.0:3000/auth/callback?code=abc&next=%2Freset-password",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/reset-password",
    );
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("abc");
  });

  it("does not use request origin for the final redirect", async () => {
    const response = await GET(
      makeRequest(
        "http://0.0.0.0:3000/auth/callback?code=abc&next=%2Freset-password",
      ),
    );

    expect(response.headers.get("location")).not.toContain("0.0.0.0");
  });

  it("sanitizes external next values", async () => {
    const response = await GET(
      makeRequest(
        "http://0.0.0.0:3000/auth/callback?code=abc&next=https%3A%2F%2Fevil.example%2Freset",
      ),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("rejects protocol-relative and backslash next values", async () => {
    const response = await GET(
      makeRequest(
        "http://0.0.0.0:3000/auth/callback?code=abc&next=%2F%2Fevil.example%2Freset",
      ),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects email verification callbacks to the verification page", async () => {
    const response = await GET(
      makeRequest(
        "http://0.0.0.0:3000/auth/callback?code=abc&flow=email_verification&next=%2Fgenerator",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/verify?next=%2Fgenerator&status=success",
    );
  });

  it("redirects failed email verification callbacks to the verification page", async () => {
    exchangeCodeForSessionMock.mockResolvedValueOnce({
      error: new Error("verification failed"),
    });

    const response = await GET(
      makeRequest(
        "http://0.0.0.0:3000/auth/callback?code=abc&flow=email_verification&next=%2Fgenerator",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/verify?next=%2Fgenerator&status=error&message=verification+failed",
    );
  });

  it("rejects 0.0.0.0 as the configured site URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://0.0.0.0:3000");

    const response = await GET(
      makeRequest(
        "http://0.0.0.0:3000/auth/callback?code=abc&next=%2Freset-password",
      ),
    );

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe(
      "Auth is not configured correctly. Please contact support.",
    );
    expect(response.headers.get("location")).toBeNull();
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
  });
});
