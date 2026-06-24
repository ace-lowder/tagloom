import React, { useEffect, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthControllerProvider,
  useAuthController,
} from "./AuthController";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/components/auth/AuthForm", () => ({
  __esModule: true,
  default: function MockAuthForm({
    onVerificationPendingChange,
  }: {
    onVerificationPendingChange?: (pending: boolean) => void;
  }) {
    const [pendingCleared, setPendingCleared] = useState(false);

    useEffect(() => {
      onVerificationPendingChange?.(true);
    }, [onVerificationPendingChange]);

    return (
      <div data-testid="auth-form">
        <button
          type="button"
          onClick={() => {
            onVerificationPendingChange?.(false);
            setPendingCleared(true);
          }}
        >
          Clear verification pending
        </button>
        {pendingCleared ? <span>verification cleared</span> : null}
      </div>
    );
  },
}));

function OpenAuthModalOnMount() {
  const { openAuthModal } = useAuthController();

  useEffect(() => {
    openAuthModal({ mode: "signup", next: "/" });
  }, [openAuthModal]);

  return null;
}

describe("AuthController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("keeps the close controls locked while verification is pending and unlocks them after pending clears", async () => {
    render(
      <AuthControllerProvider>
        <OpenAuthModalOnMount />
      </AuthControllerProvider>,
    );

    expect(await screen.findByTestId("auth-form")).toBeInTheDocument();
    const closeButton = screen.getByRole("button", { name: "Close auth modal" });
    const backdrop = screen.getByRole("button", { name: "Close auth modal backdrop" });

    await waitFor(() => expect(closeButton).toBeDisabled());

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(backdrop);

    expect(screen.getByTestId("auth-form")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear verification pending" }));

    await waitFor(() => expect(closeButton).toBeEnabled());

    fireEvent.click(closeButton);

    await waitFor(() =>
      expect(screen.queryByTestId("auth-form")).not.toBeInTheDocument(),
    );
  });
});
