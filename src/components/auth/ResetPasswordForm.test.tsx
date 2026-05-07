import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/toasts/ToastProvider";
import ResetPasswordForm from "./ResetPasswordForm";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const getSessionMock = vi.fn();
const updateUserMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: getSessionMock,
      updateUser: updateUserMock,
    },
  }),
}));

async function renderWithSession() {
  render(<ToastProvider><ResetPasswordForm /></ToastProvider>);
  await screen.findByRole("heading", { name: "Set a new password" });
}

function fillValidPasswords() {
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "new-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "new-password" },
  });
}

function createDeferredUpdate() {
  let resolve!: (value: { error: Error | null }) => void;
  const promise = new Promise<{ error: Error | null }>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    pushMock.mockReset();
    refreshMock.mockReset();
    getSessionMock.mockReset();
    updateUserMock.mockReset();
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "reset-session" } },
      error: null,
    });
    updateUserMock.mockResolvedValue({ error: null });
  });

  it("shows a helpful message when there is no active reset session", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });

    render(<ToastProvider><ResetPasswordForm /></ToastProvider>);

    expect(await screen.findByText("Reset link expired")).toBeInTheDocument();
    expect(
      screen.getByText(/Request a new password reset email/i),
    ).toBeInTheDocument();
  });

  it("uses a reset-link check toast for session check errors", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: new Error("Reset token could not be read."),
    });

    render(<ToastProvider><ResetPasswordForm /></ToastProvider>);

    expect(await screen.findByText("Reset link check failed")).toBeInTheDocument();
    expect(await screen.findByText("Reset token could not be read.")).toBeInTheDocument();
    expect(screen.queryByText("Login failed")).not.toBeInTheDocument();
  });

  it("rejects a missing password", async () => {
    await renderWithSession();

    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);

    expect(await screen.findByText("Password is required.")).toBeInTheDocument();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("rejects a short password", async () => {
    await renderWithSession();

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "short" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);

    expect(
      await screen.findByText("Password must be at least 6 characters."),
    ).toBeInTheDocument();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("rejects a mismatched confirmation", async () => {
    await renderWithSession();

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("calls updateUser with the new password on valid submit", async () => {
    await renderWithSession();

    fillValidPasswords();
    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);

    await waitFor(() =>
      expect(updateUserMock).toHaveBeenCalledWith({
        password: "new-password",
      }),
    );
    expect(
      await screen.findByText("Password updated"),
    ).toBeInTheDocument();
  });

  it("disables inputs and button during a pending submit", async () => {
    const deferred = createDeferredUpdate();
    updateUserMock.mockReturnValue(deferred.promise);
    await renderWithSession();

    fillValidPasswords();
    fireEvent.submit(
      screen.getByRole("button", { name: "Update password" }).closest("form")!,
    );

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("New password")).toBeDisabled();
    expect(screen.getByLabelText("Confirm password")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Updating..." })).toBeDisabled();

    deferred.resolve({ error: null });
    expect(
      await screen.findByText("Password updated"),
    ).toBeInTheDocument();
  });

  it("does not start a second update while a submit is pending", async () => {
    const deferred = createDeferredUpdate();
    updateUserMock.mockReturnValue(deferred.promise);
    await renderWithSession();

    fillValidPasswords();
    const form = screen
      .getByRole("button", { name: "Update password" })
      .closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledTimes(1));

    deferred.resolve({ error: null });
    expect(
      await screen.findByText("Password updated"),
    ).toBeInTheDocument();
  });

  it("keeps the form disabled after successful update while redirecting", async () => {
    await renderWithSession();

    fillValidPasswords();
    fireEvent.submit(
      screen.getByRole("button", { name: "Update password" }).closest("form")!,
    );

    expect(
      await screen.findByText("Password updated"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeDisabled();
    expect(screen.getByLabelText("Confirm password")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redirecting..." })).toBeDisabled();
  });

  it("shows Supabase update errors", async () => {
    updateUserMock.mockResolvedValue({
      error: new Error("Password should be different from the old password."),
    });
    await renderWithSession();

    fillValidPasswords();
    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);

    expect(
      await screen.findByText("Password should be different from the old password."),
    ).toBeInTheDocument();
    expect(screen.getByText("Password update failed")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("re-enables the form after a failed update", async () => {
    updateUserMock.mockResolvedValue({
      error: new Error("Password should be different from the old password."),
    });
    await renderWithSession();

    fillValidPasswords();
    fireEvent.submit(
      screen.getByRole("button", { name: "Update password" }).closest("form")!,
    );

    expect(
      await screen.findByText("Password should be different from the old password."),
    ).toBeInTheDocument();
    expect(screen.getByText("Password update failed")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).not.toBeDisabled();
    expect(screen.getByLabelText("Confirm password")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Update password" })).not.toBeDisabled();
  });
});
