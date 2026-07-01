import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmailVerificationPanel from "./EmailVerificationPanel";

describe("EmailVerificationPanel", () => {
  it("renders the main verification copy with a bold email and action buttons", () => {
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

    expect(screen.getByRole("heading", { name: "Verify your email address" })).toBeInTheDocument();
    expect(
      screen.getByText("person@example.com", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Confirm your account to claim your free tag generation\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I've confirmed my email" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Resend confirmation email" })).toBeInTheDocument();
    expect(screen.queryByText(/guest_generation=abc123/)).not.toBeInTheDocument();
  });

  it("switches into the resend view and keeps the checkbox controlled by the caller", () => {
    const onResend = vi.fn();
    const Wrapper = () => {
      const [checked, setChecked] = useState(false);
      return (
        <EmailVerificationPanel
          email="person@example.com"
          next="/"
          resendCooldownSeconds={12}
          resendState="idle"
          resendMessage={null}
          troubleshootingChecked={checked}
          onTroubleshootingCheckedChange={setChecked}
          onResend={onResend}
          onVerified={vi.fn()}
          onUseDifferentEmail={vi.fn()}
          onCancel={vi.fn()}
        />
      );
    };

    const { rerender } = render(<Wrapper />);

    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));

    expect(screen.getByRole("heading", { name: "Didn't get the email?" })).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        element?.textContent ===
        "Double-check that person@example.com is spelled correctly and check your spam or junk folder before trying again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend in 12s" })).toBeDisabled();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I confirmed my email address and checked my spam folder/i,
      }),
    );

    expect(screen.getByRole("checkbox")).toBeChecked();
    rerender(<Wrapper />);
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByRole("button", { name: "Resend in 12s" })).toBeDisabled();
    expect(onResend).not.toHaveBeenCalled();
  });

  it("enables resend when cooldown reaches zero and calls the navigation callbacks", () => {
    const onUseDifferentEmail = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <EmailVerificationPanel
        email="person@example.com"
        next="/"
        resendCooldownSeconds={8}
        resendState="idle"
        resendMessage={null}
        troubleshootingChecked={true}
        onTroubleshootingCheckedChange={vi.fn()}
        onResend={vi.fn()}
        onVerified={vi.fn()}
        onUseDifferentEmail={onUseDifferentEmail}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));
    expect(screen.getByRole("button", { name: "Resend in 8s" })).toBeDisabled();

    rerender(
      <EmailVerificationPanel
        email="person@example.com"
        next="/"
        resendCooldownSeconds={0}
        resendState="idle"
        resendMessage={null}
        troubleshootingChecked={true}
        onTroubleshootingCheckedChange={vi.fn()}
        onResend={vi.fn()}
        onVerified={vi.fn()}
        onUseDifferentEmail={onUseDifferentEmail}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("button", { name: "Resend confirmation email" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Use a different email" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onUseDifferentEmail).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("returns to the main view after a successful resend", () => {
    render(
      <EmailVerificationPanel
        email="person@example.com"
        next="/"
        resendCooldownSeconds={30}
        resendState="sent"
        resendMessage={null}
        troubleshootingChecked={false}
        onTroubleshootingCheckedChange={vi.fn()}
        onResend={vi.fn()}
        onVerified={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/We sent a fresh verification link to/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Verify your email address" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Didn't get the email?" })).not.toBeInTheDocument();
  });
});
