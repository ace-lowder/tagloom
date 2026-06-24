import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEmailVerification } from "./useEmailVerification";
import {
  clearPendingEmailVerification,
  loadPendingEmailVerification,
  savePendingEmailVerification,
} from "./emailVerificationStorage";

class MockBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public name: string) {
    void name;
  }

  postMessage() {}

  close() {}
}

const getUserMock = vi.fn();
const resendMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const unsubscribeMock = vi.fn();

const supabase = {
  auth: {
    getUser: getUserMock,
    resend: resendMock,
    onAuthStateChange: onAuthStateChangeMock,
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  window.localStorage.clear();
  clearPendingEmailVerification();
  vi.stubGlobal("BroadcastChannel", MockBroadcastChannel as unknown as typeof BroadcastChannel);
  getUserMock.mockReset();
  resendMock.mockReset();
  onAuthStateChangeMock.mockReset();
  unsubscribeMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
  resendMock.mockResolvedValue({ error: null });
  onAuthStateChangeMock.mockReturnValue({
    data: { subscription: { unsubscribe: unsubscribeMock } },
  });
});

describe("useEmailVerification", () => {
  it("stores a strict v2 record and ignores legacy v1 data", () => {
    const now = Date.now();
    window.localStorage.setItem(
      "tagloom:email-verification:v1",
      JSON.stringify({
        email: "legacy@example.com",
        next: "/old",
        emailSentAt: now,
      }),
    );

    const { result } = renderHook(() =>
      useEmailVerification({
        supabase: null,
        onVerified: vi.fn(),
      }),
    );

    expect(result.current.record).toBeNull();
    expect(loadPendingEmailVerification()).toBeNull();
    expect(window.localStorage.getItem("tagloom:email-verification:v1")).toBeNull();

    act(() => {
      savePendingEmailVerification({
        email: "person@example.com",
        next: "/?guest_generation=abc123",
        createdAt: now,
        emailSentAt: now,
      });
    });

    const stored = loadPendingEmailVerification();
    expect(stored).toEqual({
      email: "person@example.com",
      next: "/?guest_generation=abc123",
      createdAt: now,
      emailSentAt: now,
    });
  });

  it("keeps resend immediate when emailSentAt is null and uses the friendly fallback copy", async () => {
    const now = Date.now();
    const { result } = renderHook(() =>
      useEmailVerification({
        supabase,
        onVerified: vi.fn(),
      }),
    );

    act(() => {
      result.current.startVerification({
        email: "person@example.com",
        next: "/?guest_generation=abc123",
        createdAt: now,
        emailSentAt: null,
      });
    });

    await waitFor(() => expect(result.current.record).not.toBeNull());
    expect(result.current.resendCooldownSeconds).toBe(0);

    resendMock.mockResolvedValueOnce({
      error: new Error("service temporarily unavailable"),
    });

    await act(async () => {
      await result.current.resendConfirmationEmail();
    });

    expect(resendMock).toHaveBeenCalledWith({
      type: "signup",
      email: "person@example.com",
      options: expect.objectContaining({
        emailRedirectTo: expect.stringContaining("flow=email_verification"),
      }),
    });
    expect(result.current.resendStatus).toBe("error");
    expect(result.current.resendMessage).toBe(
      "We couldn't resend the verification email right now. Please try again in a moment.",
    );
  });

  it("preserves the exact 429 resend message", async () => {
    const now = Date.now();
    const { result } = renderHook(() =>
      useEmailVerification({
        supabase,
        onVerified: vi.fn(),
      }),
    );

    act(() => {
      result.current.startVerification({
        email: "person@example.com",
        next: "/",
        createdAt: now,
        emailSentAt: now,
      });
    });

    await waitFor(() => expect(result.current.record).not.toBeNull());
    resendMock.mockResolvedValueOnce({
      error: Object.assign(new Error("Too many requests. Please try again shortly."), {
        status: 429,
      }),
    });

    await act(async () => {
      await result.current.resendConfirmationEmail();
    });

    expect(result.current.resendStatus).toBe("error");
    expect(result.current.resendMessage).toBe(
      "We couldn't send your confirmation email right now. Email delivery is temporarily busy. Your listing has been saved. Please try again shortly.",
    );
  });
});
