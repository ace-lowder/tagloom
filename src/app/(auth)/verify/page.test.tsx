import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VerifyPage from "./page";

const { replaceMock, dispatchAuthSuccessMock, postMessageMock, closeMock } = vi.hoisted(
  () => ({
    replaceMock: vi.fn(),
    dispatchAuthSuccessMock: vi.fn(),
    postMessageMock: vi.fn(),
    closeMock: vi.fn(),
  }),
);

let currentSearchParams = new URLSearchParams("status=success&next=%2Fgenerator");

class MockBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public name: string) {
    void name;
  }

  postMessage(...args: unknown[]) {
    postMessageMock(...args);
  }

  close(...args: unknown[]) {
    closeMock(...args);
  }
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock("@/lib/authModal", () => ({
  dispatchAuthSuccess: dispatchAuthSuccessMock,
  sanitizeNextPath: (next: string | null | undefined) => (next && next.startsWith("/") ? next : "/"),
}));

describe("/verify page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    currentSearchParams = new URLSearchParams("status=success&next=%2Fgenerator");
    replaceMock.mockReset();
    dispatchAuthSuccessMock.mockReset();
    postMessageMock.mockReset();
    closeMock.mockReset();
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel as unknown as typeof BroadcastChannel);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the success countdown copy", () => {
    render(<VerifyPage />);

    expect(dispatchAuthSuccessMock).toHaveBeenCalledTimes(1);
    expect(postMessageMock).toHaveBeenCalledTimes(1);
    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Continuing automatically in 5s")).toBeInTheDocument();
  });

  it("redirects once when Continue is double-clicked and ignores later timer completion", () => {
    vi.useFakeTimers();

    render(<VerifyPage />);

    const continueButton = screen.getByRole("button", { name: "Continue to my listing" });
    fireEvent.click(continueButton);
    fireEvent.click(continueButton);

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/generator");

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(replaceMock).toHaveBeenCalledTimes(1);
  });

  it("does not rebroadcast or redispatch on rerender", () => {
    const { rerender } = render(<VerifyPage />);

    expect(dispatchAuthSuccessMock).toHaveBeenCalledTimes(1);
    expect(postMessageMock).toHaveBeenCalledTimes(1);
    expect(closeMock).toHaveBeenCalledTimes(1);

    rerender(<VerifyPage />);

    expect(dispatchAuthSuccessMock).toHaveBeenCalledTimes(1);
    expect(postMessageMock).toHaveBeenCalledTimes(1);
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("renders the generic error state", () => {
    currentSearchParams = new URLSearchParams("status=error&next=%2Fgenerator");

    render(<VerifyPage />);

    expect(screen.queryByText("Verification issue")).not.toBeInTheDocument();
    expect(screen.getByText("This verification link is no longer valid")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The link may have expired or may already have been used. Return to Log in and request a new confirmation email.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Return to Log in" }));
    expect(replaceMock).toHaveBeenCalledWith("/login?next=%2Fgenerator");
  });

  it("renders the error state when no verification result is present", () => {
    currentSearchParams = new URLSearchParams("next=%2Fgenerator");

    render(<VerifyPage />);

    expect(screen.queryByText("Check your inbox")).not.toBeInTheDocument();
    expect(screen.getByText("This verification link is no longer valid")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The link may have expired or may already have been used. Return to Log in and request a new confirmation email.",
      ),
    ).toBeInTheDocument();
  });
});
