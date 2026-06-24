import type { User } from "@supabase/supabase-js";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEmailVerification } from "./useEmailVerification";
import {
  clearPendingEmailVerification,
  loadPendingEmailVerification,
} from "./emailVerificationStorage";

type AuthStateCallback = (
  event: string,
  session: { user: User | null } | null,
) => void;

const broadcastInstances: MockBroadcastChannel[] = [];
const postMessageMock = vi.fn();
const closeMock = vi.fn();
const getUserMock = vi.fn();
const resendMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const unsubscribeMock = vi.fn();
let authStateCallback: AuthStateCallback | null = null;

class MockBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public name: string) {
    broadcastInstances.push(this);
  }

  postMessage(...args: unknown[]) {
    postMessageMock(...args);
  }

  close(...args: unknown[]) {
    closeMock(...args);
  }
}

const supabase = {
  auth: {
    getUser: getUserMock,
    resend: resendMock,
    onAuthStateChange: onAuthStateChangeMock,
  },
};

function makeVerifiedUser(): User {
  return {
    id: "user_123",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: "person@example.com",
    email_confirmed_at: new Date().toISOString(),
  } as User;
}

function renderVerification(
  onVerified = vi.fn(),
  onPendingChange = vi.fn(),
) {
  return renderHook(() =>
    useEmailVerification({
      supabase,
      onVerified,
      onPendingChange,
    }),
  );
}

beforeEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  window.localStorage.clear();
  clearPendingEmailVerification();
  broadcastInstances.length = 0;
  postMessageMock.mockReset();
  closeMock.mockReset();
  getUserMock.mockReset();
  resendMock.mockReset();
  onAuthStateChangeMock.mockReset();
  unsubscribeMock.mockReset();
  authStateCallback = null;
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
  resendMock.mockResolvedValue({ error: null });
  onAuthStateChangeMock.mockImplementation((callback: AuthStateCallback) => {
    authStateCallback = callback;
    return {
      data: { subscription: { unsubscribe: unsubscribeMock } },
    };
  });
  vi.stubGlobal(
    "BroadcastChannel",
    MockBroadcastChannel as unknown as typeof BroadcastChannel,
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useEmailVerification", () => {
  it("reports signup cooldown when emailSentAt is present and keeps login resends immediate", () => {
    const { result } = renderVerification();
    const now = Date.now();

    act(() => {
      result.current.startVerification({
        email: "person@example.com",
        next: "/",
        createdAt: now,
        emailSentAt: now - 5_000,
      });
    });

    expect(result.current.resendCooldownSeconds).toBeGreaterThan(0);

    act(() => {
      result.current.startVerification({
        email: "person@example.com",
        next: "/",
        createdAt: now,
        emailSentAt: null,
      });
    });

    expect(result.current.resendCooldownSeconds).toBe(0);
  });

  it("keeps resend immediate when emailSentAt is null and uses the friendly fallback copy", async () => {
    const { result } = renderVerification();
    const now = Date.now();

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
    const { result } = renderVerification();
    const now = Date.now();

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

  it("resets resend timestamp and cooldown after a successful resend", async () => {
    vi.useFakeTimers();
    const frozenNow = new Date("2026-01-01T12:00:00.000Z").getTime();
    vi.setSystemTime(frozenNow);
    const { result } = renderVerification();

    act(() => {
      result.current.startVerification({
        email: "person@example.com",
        next: "/?guest_generation=abc123",
        createdAt: frozenNow,
        emailSentAt: null,
      });
    });

    resendMock.mockResolvedValueOnce({ error: null });

    await act(async () => {
      await result.current.resendConfirmationEmail();
    });

    const stored = loadPendingEmailVerification();
    expect(stored?.emailSentAt).toBe(frozenNow);
    expect(result.current.resendStatus).toBe("sent");
    expect(result.current.resendCooldownSeconds).toBe(30);
    expect(result.current.troubleshootingChecked).toBe(false);
  });

  it("finishes verification from auth state changes, writes signup cooldown, and passes the record to onVerified", async () => {
    const onVerified = vi.fn();
    const onPendingChange = vi.fn();
    const { result } = renderVerification(onVerified, onPendingChange);
    const now = Date.now();

    act(() => {
      result.current.startVerification({
        email: "person@example.com",
        next: "/?guest_generation=abc123",
        createdAt: now,
        emailSentAt: null,
      });
    });

    await waitFor(() => expect(authStateCallback).not.toBeNull());

    await act(async () => {
      authStateCallback?.("SIGNED_IN", { user: makeVerifiedUser() });
    });

    expect(onVerified).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "person@example.com",
        next: "/?guest_generation=abc123",
      }),
    );
    expect(onPendingChange).toHaveBeenCalledWith(false);
    expect(window.localStorage.getItem("tagloom:signup-cooldown:v1")).toMatch(/^\d+$/);
    expect(loadPendingEmailVerification()).toBeNull();
    expect(result.current.record).toBeNull();
  });

  it("checks verification after a broadcast message", async () => {
    const onVerified = vi.fn();
    const { result } = renderVerification(onVerified);
    const now = Date.now();

    act(() => {
      result.current.startVerification({
        email: "person@example.com",
        next: "/",
        createdAt: now,
        emailSentAt: null,
      });
    });

    await waitFor(() => expect(broadcastInstances).toHaveLength(1));
    await waitFor(() => expect(getUserMock).toHaveBeenCalledTimes(1));

    getUserMock.mockResolvedValueOnce({ data: { user: makeVerifiedUser() }, error: null });
    act(() => {
      broadcastInstances[0].onmessage?.({
        data: { type: "email_verified" },
      } as MessageEvent);
    });

    await waitFor(() => expect(getUserMock).toHaveBeenCalledTimes(2));
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it("checks verification after focus returns to the page", async () => {
    const onVerified = vi.fn();
    const { result } = renderVerification(onVerified);
    const now = Date.now();

    act(() => {
      result.current.startVerification({
        email: "person@example.com",
        next: "/",
        createdAt: now,
        emailSentAt: null,
      });
    });

    await waitFor(() => expect(getUserMock).toHaveBeenCalledTimes(1));

    getUserMock.mockResolvedValueOnce({ data: { user: makeVerifiedUser() }, error: null });
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => expect(getUserMock).toHaveBeenCalledTimes(2));
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it("checks verification when the page becomes visible again", async () => {
    const onVerified = vi.fn();
    const { result } = renderVerification(onVerified);
    const now = Date.now();

    act(() => {
      result.current.startVerification({
        email: "person@example.com",
        next: "/",
        createdAt: now,
        emailSentAt: null,
      });
    });

    await waitFor(() => expect(getUserMock).toHaveBeenCalledTimes(1));

    getUserMock.mockResolvedValueOnce({ data: { user: makeVerifiedUser() }, error: null });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => expect(getUserMock).toHaveBeenCalledTimes(2));
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it("supports a manual verification check", async () => {
    const onVerified = vi.fn();
    const { result } = renderVerification(onVerified);
    const now = Date.now();

    act(() => {
      result.current.startVerification({
        email: "person@example.com",
        next: "/",
        createdAt: now,
        emailSentAt: null,
      });
    });

    await waitFor(() => expect(getUserMock).toHaveBeenCalledTimes(1));

    getUserMock.mockResolvedValueOnce({ data: { user: makeVerifiedUser() }, error: null });
    let manualVerified = false;
    await act(async () => {
      manualVerified = await result.current.requestManualVerificationCheck();
    });

    expect(manualVerified).toBe(true);
    expect(getUserMock).toHaveBeenCalledTimes(2);
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it("checks verification on the 10-second poll", async () => {
    vi.useFakeTimers();
    const { result } = renderVerification();
    const now = Date.now();

    act(() => {
      result.current.startVerification({
        email: "person@example.com",
        next: "/",
        createdAt: now,
        emailSentAt: null,
      });
    });

    await act(async () => {});
    expect(getUserMock).toHaveBeenCalledTimes(1);
    getUserMock.mockResolvedValueOnce({ data: { user: makeVerifiedUser() }, error: null });

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(getUserMock).toHaveBeenCalledTimes(2);
  });

  it("creates separate channels for multiple mounted verifications", async () => {
    const first = renderVerification();
    const second = renderVerification();
    const now = Date.now();

    act(() => {
      first.result.current.startVerification({
        email: "first@example.com",
        next: "/",
        createdAt: now,
        emailSentAt: null,
      });
      second.result.current.startVerification({
        email: "second@example.com",
        next: "/",
        createdAt: now,
        emailSentAt: null,
      });
    });

    await waitFor(() => expect(broadcastInstances).toHaveLength(2));
    expect(broadcastInstances.map((channel) => channel.name)).toEqual([
      "tagloom-auth",
      "tagloom-auth",
    ]);

    first.unmount();
    second.unmount();
  });

  it("cleans up its subscription and broadcast channel exactly once on unmount", async () => {
    const { result, unmount } = renderVerification();
    const now = Date.now();

    act(() => {
      result.current.startVerification({
        email: "person@example.com",
        next: "/",
        createdAt: now,
        emailSentAt: null,
      });
    });

    await waitFor(() => expect(broadcastInstances).toHaveLength(1));

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
