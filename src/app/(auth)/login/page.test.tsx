import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
  default: function MockAuthForm({
    onVerificationPendingChange,
  }: {
    onVerificationPendingChange?: (pending: boolean) => void;
  }) {
    return (
      <div data-testid="auth-form">
        <button
          type="button"
          onClick={() => onVerificationPendingChange?.(true)}
        >
          Trigger verification pending
        </button>
      </div>
    );
  },
}));

describe("login page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    pushMock.mockReset();
  });

  it("locks the back button when AuthForm reports that verification is pending", () => {
    render(<LoginPage />);

    const backButton = screen.getByRole("button", { name: "Back" });
    expect(backButton).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Trigger verification pending" }));

    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });
});
