import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthForm from "./AuthForm";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const signUpMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const signInWithOAuthMock = vi.fn();
const resetPasswordForEmailMock = vi.fn();
const turnstileGetTokenMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signUp: signUpMock,
      signInWithPassword: signInWithPasswordMock,
      signInWithOAuth: signInWithOAuthMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
    },
  }),
}));

vi.mock("@/components/security/TurnstileField", async () => {
  const ReactModule = await import("react");

  const MockTurnstileField = ReactModule.forwardRef<
    { getToken: () => Promise<string | null> },
    { onError?: (message: string) => void }
  >(function MockTurnstileField(_props, ref) {
    ReactModule.useImperativeHandle(ref, () => ({
      getToken: turnstileGetTokenMock,
    }));

    return <div data-testid="turnstile-field" aria-hidden="true" />;
  });

  return {
    __esModule: true,
    default: MockTurnstileField,
  };
});

function mockJsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return Promise.resolve({
    ok,
    status,
    json: async () => body,
  } as Response);
}

function setupFetchMock() {
  return vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.includes("/api/auth/email-exists")) {
      return mockJsonResponse({ exists: false });
    }

    if (url.includes("/api/auth/signup-eligibility")) {
      return mockJsonResponse({ ok: true });
    }

    return mockJsonResponse({ error: "Unexpected fetch call." }, false, 500);
  });
}

async function moveSignupToPasswordStep() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "person@example.com" },
  });
  fireEvent.submit(screen.getByRole("button", { name: "Continue with email" }).closest("form")!);

  await screen.findByLabelText("Password");
}

describe("AuthForm signup guard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubGlobal("fetch", setupFetchMock());
    window.localStorage.clear();
    window.sessionStorage.clear();
    pushMock.mockReset();
    refreshMock.mockReset();
    signUpMock.mockReset();
    signInWithPasswordMock.mockReset();
    signInWithOAuthMock.mockReset();
    resetPasswordForEmailMock.mockReset();
    turnstileGetTokenMock.mockReset();
    turnstileGetTokenMock.mockResolvedValue("turnstile-token");
    signUpMock.mockResolvedValue({ data: {}, error: null });
    signInWithPasswordMock.mockResolvedValue({ error: null });
    signInWithOAuthMock.mockResolvedValue({ error: null, data: {} });
    resetPasswordForEmailMock.mockResolvedValue({ error: null });
  });

  it("blocks final signup submit from localStorage cooldown", async () => {
    window.localStorage.setItem(
      "tagloom:signup-cooldown:v1",
      String(Date.now()),
    );

    render(
      <AuthForm
        mode="signup"
        onModeChange={vi.fn()}
      />,
    );

    await moveSignupToPasswordStep();
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "hunter2-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);

    expect(
      await screen.findByText(
        "A free trial was already started recently from this browser. Try again later or log in if you already created an account.",
      ),
    ).toBeInTheDocument();
    expect(turnstileGetTokenMock).not.toHaveBeenCalled();
    expect(signUpMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalledWith(
      "/api/auth/signup-eligibility",
      expect.anything(),
    );
  });

  it("calls signup eligibility before supabase signUp", async () => {
    const fetchMock = setupFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthForm mode="signup" onModeChange={vi.fn()} />);

    await moveSignupToPasswordStep();
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "hunter2-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);

    await waitFor(() => expect(signUpMock).toHaveBeenCalledTimes(1));

    const eligibilityIndex = fetchMock.mock.calls.findIndex(([input]) =>
      String(input).includes("/api/auth/signup-eligibility"),
    );
    const signUpOrder = signUpMock.mock.invocationCallOrder[0];
    const fetchOrder = fetchMock.mock.invocationCallOrder[eligibilityIndex];

    expect(eligibilityIndex).toBeGreaterThanOrEqual(0);
    expect(fetchOrder).toBeLessThan(signUpOrder);

    const eligibilityCall = fetchMock.mock.calls[eligibilityIndex];
    expect(eligibilityCall?.[1]).toMatchObject({
      method: "POST",
      headers: {
        "x-turnstile-token": "turnstile-token",
      },
    });
  });

  it("does not call supabase signUp when signup eligibility blocks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url.includes("/api/auth/email-exists")) {
          return mockJsonResponse({ exists: false });
        }

        if (url.includes("/api/auth/signup-eligibility")) {
          return mockJsonResponse(
            { error: "Too many requests. Please try again shortly." },
            false,
            429,
          );
        }

        return mockJsonResponse({ error: "Unexpected fetch call." }, false, 500);
      }),
    );

    render(<AuthForm mode="signup" onModeChange={vi.fn()} />);

    await moveSignupToPasswordStep();
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "hunter2-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);

    expect(
      await screen.findByText("Too many requests. Please try again shortly."),
    ).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("does not call signup eligibility during login", async () => {
    const fetchMock = setupFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthForm mode="login" onModeChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "hunter2-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Log in" }).closest("form")!);

    await waitFor(() => expect(signInWithPasswordMock).toHaveBeenCalledTimes(1));
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("/api/auth/signup-eligibility"),
      ),
    ).toBe(false);
  });

  it("sends forgot-password emails through the reset callback route", async () => {
    render(<AuthForm mode="login" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Reset password" }).closest("form")!,
    );

    await waitFor(() =>
      expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
        "person@example.com",
        {
          redirectTo:
            "http://localhost:3000/auth/callback?next=%2Freset-password",
        },
      ),
    );
  });

  it("does not send forgot-password emails when site URL config is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    render(<AuthForm mode="login" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Reset password" }).closest("form")!,
    );

    expect(
      await screen.findByText(
        "Auth is not configured correctly. Please contact support.",
      ),
    ).toBeInTheDocument();
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
  });

  it("does not send forgot-password emails when site URL config is invalid", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-url");
    render(<AuthForm mode="login" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Reset password" }).closest("form")!,
    );

    expect(
      await screen.findByText(
        "Auth is not configured correctly. Please contact support.",
      ),
    ).toBeInTheDocument();
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
  });

  it("rejects 0.0.0.0 for forgot-password redirects", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://0.0.0.0:3000");
    render(<AuthForm mode="login" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Reset password" }).closest("form")!,
    );

    expect(
      await screen.findByText(
        "Auth is not configured correctly. Please contact support.",
      ),
    ).toBeInTheDocument();
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
  });

  it("leaves Google OAuth flow unaffected", async () => {
    const fetchMock = setupFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthForm mode="signup" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => expect(signInWithOAuthMock).toHaveBeenCalledTimes(1));
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("/api/auth/signup-eligibility"),
      ),
    ).toBe(false);
  });

  it("writes cooldown to localStorage when signup succeeds", async () => {
    signUpMock.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });

    render(<AuthForm mode="signup" onModeChange={vi.fn()} />);

    await moveSignupToPasswordStep();
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "hunter2-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);

    await waitFor(() =>
      expect(window.localStorage.getItem("tagloom:signup-cooldown:v1")).toMatch(/^\d+$/),
    );
  });

  it("does not write cooldown when signup fails", async () => {
    signUpMock.mockResolvedValue({
      data: null,
      error: new Error("Signup failed."),
    });

    render(<AuthForm mode="signup" onModeChange={vi.fn()} />);

    await moveSignupToPasswordStep();
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "hunter2-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);

    expect(await screen.findByText("Signup failed.")).toBeInTheDocument();
    expect(window.localStorage.getItem("tagloom:signup-cooldown:v1")).toBeNull();
  });
});
