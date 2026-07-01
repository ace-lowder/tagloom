import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmailVerificationPanel from "./EmailVerificationPanel";

describe("EmailVerificationPanel", () => {
  it("renders the main verification copy with the resend and cancel actions", () => {
    const onCancel = vi.fn();

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
        onUseDifferentEmail={vi.fn()}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("heading", { name: "Verify your email address" })).toBeInTheDocument();
    expect(
      screen.getByText("person@example.com", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Confirm your account to claim your free tag generation\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend confirmation email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "I\'ve confirmed my email" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use a different email" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("switches into the resend view and keeps the caller-controlled checkbox and cooldown", () => {
    const onResend = vi.fn();
    const onUseDifferentEmail = vi.fn();
    const onCancel = vi.fn();

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
          onUseDifferentEmail={onUseDifferentEmail}
          onCancel={onCancel}
        />
      );
    };

    render(<Wrapper />);

    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));

    expect(screen.getByRole("heading", { name: "Didn't get the email?" })).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        element?.textContent ===
        "Double-check that person@example.com is spelled correctly and check your spam or junk folder before trying again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend in 12s" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Use a different email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I confirmed my email address and checked my spam folder/i,
      }),
    );

    expect(screen.getByRole("checkbox")).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("heading", { name: "Verify your email address" })).toBeInTheDocument();
    expect(onResend).not.toHaveBeenCalled();
    expect(onUseDifferentEmail).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));

    expect(screen.getByRole("button", { name: "Resend in 12s" })).toBeDisabled();
    expect(screen.getByRole("checkbox")).toBeChecked();
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
        onUseDifferentEmail={onUseDifferentEmail}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("button", { name: "Resend confirmation email" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Use a different email" }));

    expect(onUseDifferentEmail).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
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
        onUseDifferentEmail={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/We sent a fresh verification link to/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/We sent a verification link to/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Verify your email address" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Didn't get the email?" })).not.toBeInTheDocument();
  });
});
