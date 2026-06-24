import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmailVerificationPanel from "./EmailVerificationPanel";

describe("EmailVerificationPanel", () => {
  it("uses guest-generation copy without exposing the raw next path", () => {
    render(
      <EmailVerificationPanel
        email="person@example.com"
        next="/?guest_generation=abc123"
        resendCooldownSeconds={0}
        resendState="idle"
        resendMessage={null}
        troubleshootingChecked={false}
        onTroubleshootingCheckedChange={vi.fn()}
        onResend={vi.fn()}
        onVerified={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Confirm your account to claim your free tag generation\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(/guest_generation=abc123/)).not.toBeInTheDocument();
  });
});
