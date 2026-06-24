import React, { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
    useEffect(() => {
      onVerificationPendingChange?.(true);
    }, [onVerificationPendingChange]);

    return <div data-testid="auth-form" />;
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

  it("locks the modal close button while verification is pending", async () => {
    render(
      <AuthControllerProvider>
        <OpenAuthModalOnMount />
      </AuthControllerProvider>,
    );

    expect(await screen.findByTestId("auth-form")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Close auth modal" })).toBeDisabled(),
    );
  });
});
