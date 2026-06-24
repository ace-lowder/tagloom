import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("requires the checklist before enabling resend", () => {
    const onResend = vi.fn();
    const Wrapper = () => {
      const [checked, setChecked] = useState(false);
      return (
        <EmailVerificationPanel
          email="person@example.com"
          next="/"
          resendCooldownSeconds={0}
          resendState="idle"
          resendMessage={null}
          troubleshootingChecked={checked}
          onTroubleshootingCheckedChange={setChecked}
          onResend={onResend}
          onVerified={vi.fn()}
        />
      );
    };

    render(<Wrapper />);

    const resendButton = screen.getByRole("button", { name: "Resend confirmation email" });
    expect(resendButton).toBeDisabled();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I confirmed my email address and checked my spam folder/i,
      }),
    );

    expect(screen.getByRole("button", { name: "Resend confirmation email" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));
    expect(onResend).toHaveBeenCalledTimes(1);
  });
});
