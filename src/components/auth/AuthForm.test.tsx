import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/toasts/ToastProvider";
import AuthForm from "./AuthForm";

function renderWithToasts(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const pushMock = vi.fn();
const refreshMock = vi.fn();
const signUpMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const signInWithOAuthMock = vi.fn();
const resendMock = vi.fn();
const resetPasswordForEmailMock = vi.fn();
const getUserMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
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
        resend: resendMock,
        resetPasswordForEmail: resetPasswordForEmailMock,
        getUser: getUserMock,
        onAuthStateChange: onAuthStateChangeMock,
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
    resendMock.mockReset();
    resetPasswordForEmailMock.mockReset();
    getUserMock.mockReset();
    onAuthStateChangeMock.mockReset();
    turnstileGetTokenMock.mockReset();
    turnstileGetTokenMock.mockResolvedValue("turnstile-token");
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    signUpMock.mockResolvedValue({ data: {}, error: null });
    signInWithPasswordMock.mockResolvedValue({ error: null });
    signInWithOAuthMock.mockResolvedValue({ error: null, data: {} });
    resendMock.mockResolvedValue({ error: null });
    resetPasswordForEmailMock.mockResolvedValue({ error: null });
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("blocks final signup submit from localStorage cooldown", async () => {
    window.localStorage.setItem(
      "tagloom:signup-cooldown:v1",
      String(Date.now()),
    );

    renderWithToasts(
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

    renderWithToasts(<AuthForm mode="signup" onModeChange={vi.fn()} />);

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

    renderWithToasts(<AuthForm mode="signup" onModeChange={vi.fn()} />);

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

    renderWithToasts(<AuthForm mode="login" onModeChange={vi.fn()} />);

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
    renderWithToasts(<AuthForm mode="login" onModeChange={vi.fn()} />);

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

  it("uses a password reset failure toast instead of login failure", async () => {
    resetPasswordForEmailMock.mockResolvedValue({
      error: new Error("Reset service is temporarily unavailable."),
    });
    renderWithToasts(<AuthForm mode="login" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Reset password" }).closest("form")!,
    );

    expect(await screen.findByText("Password reset failed")).toBeInTheDocument();
    expect(
      await screen.findByText("Reset service is temporarily unavailable."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Login failed")).not.toBeInTheDocument();
  });

  it("does not send forgot-password emails when site URL config is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    renderWithToasts(<AuthForm mode="login" onModeChange={vi.fn()} />);

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
    renderWithToasts(<AuthForm mode="login" onModeChange={vi.fn()} />);

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
    renderWithToasts(<AuthForm mode="login" onModeChange={vi.fn()} />);

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

    renderWithToasts(<AuthForm mode="signup" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => expect(signInWithOAuthMock).toHaveBeenCalledTimes(1));
    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: "google",
      options: expect.objectContaining({
        redirectTo: expect.stringContaining("/auth/callback"),
      }),
    });
    const oauthArgs = signInWithOAuthMock.mock.calls[0]?.[0];
    expect(oauthArgs.options.redirectTo).toContain("flow=redirect");
    expect(oauthArgs.options.redirectTo).not.toContain("flow=popup");
    expect(oauthArgs.options.skipBrowserRedirect).toBeUndefined();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("/api/auth/signup-eligibility"),
      ),
    ).toBe(false);
  });

  it("ignores preferGooglePopup and still uses redirect flow", async () => {
    renderWithToasts(
      <AuthForm mode="signup" onModeChange={vi.fn()} preferGooglePopup />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => expect(signInWithOAuthMock).toHaveBeenCalledTimes(1));
    const oauthArgs = signInWithOAuthMock.mock.calls[0]?.[0];
    expect(oauthArgs.options.redirectTo).toContain("flow=redirect");
    expect(oauthArgs.options.redirectTo).not.toContain("flow=popup");
    expect(oauthArgs.options.skipBrowserRedirect).toBeUndefined();
  });

  it("maps access_denied to friendly cancellation copy", async () => {
    signInWithOAuthMock.mockResolvedValue({
      error: new Error("access_denied"),
      data: {},
    });

    renderWithToasts(<AuthForm mode="signup" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(await screen.findByText("Google sign-in canceled")).toBeInTheDocument();
    expect(
      await screen.findByText("You can try again when you're ready."),
    ).toBeInTheDocument();
    expect(screen.queryByText("access_denied")).not.toBeInTheDocument();
  });

  it("uses a Google sign-in failure toast instead of login failure", async () => {
    signInWithOAuthMock.mockResolvedValue({
      error: new Error("Provider is unavailable."),
      data: {},
    });

    renderWithToasts(<AuthForm mode="signup" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(await screen.findByText("Google sign-in failed")).toBeInTheDocument();
    expect(await screen.findByText("Provider is unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("Login failed")).not.toBeInTheDocument();
  });

  it("writes cooldown to localStorage when signup succeeds", async () => {
    signUpMock.mockResolvedValue({
      data: {
        session: {
          access_token: "x",
          user: {
            email_confirmed_at: new Date().toISOString(),
          },
        },
      },
      error: null,
    });

    renderWithToasts(<AuthForm mode="signup" onModeChange={vi.fn()} />);

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

    renderWithToasts(<AuthForm mode="signup" onModeChange={vi.fn()} />);

    await moveSignupToPasswordStep();
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "hunter2-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);

    expect(await screen.findByText("Signup failed")).toBeInTheDocument();
    expect(await screen.findByText("Signup failed.")).toBeInTheDocument();
    expect(screen.queryByText("Login failed")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("tagloom:signup-cooldown:v1")).toBeNull();
  });

  it("keeps a no-session signup in the verification flow and uses the email verification callback", async () => {
    signUpMock.mockResolvedValue({
      data: {},
      error: null,
    });

    renderWithToasts(<AuthForm mode="signup" onModeChange={vi.fn()} />);

    await moveSignupToPasswordStep();
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "hunter2-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);

    expect(
      await screen.findByText("Verify your email address"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/We sent a verification link/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Confirm your account to continue\./),
    ).toBeInTheDocument();
    const storedRecord = JSON.parse(
      window.localStorage.getItem("tagloom:email-verification:v2")!,
    ) as {
      email: string;
      next: string;
      createdAt: number;
      emailSentAt: number | null;
    };
    expect(storedRecord).toMatchObject({
      email: "person@example.com",
      next: "/",
      emailSentAt: expect.any(Number),
    });
    expect(Number.isFinite(storedRecord.createdAt)).toBe(true);
    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "person@example.com",
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining("flow=email_verification"),
        }),
      }),
    );
  });

  it("switches to the verification flow when login says the email is not confirmed", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      error: new Error("email_not_confirmed"),
    });

    renderWithToasts(<AuthForm mode="login" onModeChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "hunter2-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Log in" }).closest("form")!);

    expect(await screen.findByText("Verify your email address")).toBeInTheDocument();
    expect(
      await screen.findByText(/Confirm your account to continue\./),
    ).toBeInTheDocument();
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "hunter2-password",
    });
    const storedRecord = JSON.parse(
      window.localStorage.getItem("tagloom:email-verification:v2")!,
    ) as {
      email: string;
      next: string;
      createdAt: number;
      emailSentAt: number | null;
    };
    expect(storedRecord).toMatchObject({
      email: "person@example.com",
      next: "/",
      emailSentAt: null,
    });
    expect(Number.isFinite(storedRecord.createdAt)).toBe(true);
  });

  it("resends a verification email from the verification view", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      error: new Error("email_not_confirmed"),
    });

    renderWithToasts(<AuthForm mode="login" onModeChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "hunter2-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Log in" }).closest("form")!);

    await screen.findByText("Verify your email address");
    const spamCheckbox = await screen.findByRole("checkbox", {
      name: /I confirmed my email address and checked my spam folder/i,
    });
    fireEvent.click(spamCheckbox);
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));

    await waitFor(() => expect(resendMock).toHaveBeenCalledTimes(1));
    expect(resendMock).toHaveBeenCalledWith({
      type: "signup",
      email: "person@example.com",
      options: expect.objectContaining({
        emailRedirectTo: expect.stringContaining("flow=email_verification"),
      }),
    });
    expect(await screen.findByText("We sent a fresh verification email.")).toBeInTheDocument();
    expect(await screen.findByText(/Confirm your account to continue\./)).toBeInTheDocument();
  });
});
