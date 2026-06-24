import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/components/auth/AuthForm", () => ({
  __esModule: true,
  default: () => <div data-testid="auth-form" />,
}));

describe("login page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    pushMock.mockReset();
  });

  it("locks the back button while verification is pending", () => {
    window.localStorage.setItem(
      "tagloom:email-verification:v2",
      JSON.stringify({
        email: "person@example.com",
        next: "/",
        createdAt: Date.now(),
        emailSentAt: Date.now(),
      }),
    );

    render(<LoginPage />);

    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });
});
