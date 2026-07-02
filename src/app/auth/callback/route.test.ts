import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const verifyOtpMock = vi.fn();
const exchangeCodeForSessionMock = vi.fn();
let supabaseServerClient:
  | {
      auth: {
        verifyOtp: typeof verifyOtpMock;
        exchangeCodeForSession: typeof exchangeCodeForSessionMock;
      };
    }
  | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => supabaseServerClient,
}));

function makeRequest(url: string) {
  return new Request(url);
}

describe("auth callback route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    verifyOtpMock.mockReset();
    exchangeCodeForSessionMock.mockReset();
    verifyOtpMock.mockResolvedValue({ error: null });
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    supabaseServerClient = {
      auth: {
        verifyOtp: verifyOtpMock,
        exchangeCodeForSession: exchangeCodeForSessionMock,
      },
    };
  });

  it("verifies email confirmation token hashes before code exchange", async () => {
    const response = await GET(
      makeRequest(
        "http://0.0.0.0:3000/auth/callback?code=abc&flow=email_verification&token_hash=token-123&type=signup&next=%2Fgenerator",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/verify?next=%2Fgenerator&status=success",
    );
    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: "token-123",
      type: "signup",
    });
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
  });

  it("redirects failed email verification token hashes to the verification error state", async () => {
    verifyOtpMock.mockResolvedValueOnce({
      error: new Error("verification failed"),
    });

    const response = await GET(
      makeRequest(
        "http://0.0.0.0:3000/auth/callback?code=abc&flow=email_verification&token_hash=token-123&type=signup&next=%2Fgenerator",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/verify?next=%2Fgenerator&status=error",
    );
    expect(verifyOtpMock).toHaveBeenCalledTimes(1);
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
  });

  it("rejects missing or invalid token hash parameters for email verification", async () => {
    for (const url of [
      "http://0.0.0.0:3000/auth/callback?flow=email_verification&type=signup&next=%2Fgenerator",
      "http://0.0.0.0:3000/auth/callback?flow=email_verification&token_hash=token-123&type=magic_link&next=%2Fgenerator",
    ]) {
      const response = await GET(makeRequest(url));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/verify?next=%2Fgenerator&status=error",
      );
    }

    expect(verifyOtpMock).not.toHaveBeenCalled();
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
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
    expect(verifyOtpMock).not.toHaveBeenCalled();
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

  it("uses a generic popup error message instead of raw provider details", async () => {
    exchangeCodeForSessionMock.mockResolvedValueOnce({
      error: new Error("Provider said no"),
    });

    const response = await GET(
      makeRequest(
        "http://0.0.0.0:3000/auth/callback?code=abc&flow=popup&next=%2Flogin",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "http://localhost:3000/auth/popup-complete?next=%2Flogin&status=error&message=Could+not+finish+sign-in.",
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
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });
});
