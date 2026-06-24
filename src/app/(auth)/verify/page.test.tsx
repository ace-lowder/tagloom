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
  useSearchParams: () => new URLSearchParams("status=success&next=%2Fgenerator"),
}));

vi.mock("@/lib/authModal", () => ({
  dispatchAuthSuccess: dispatchAuthSuccessMock,
  sanitizeNextPath: (next: string | null | undefined) => (next && next.startsWith("/") ? next : "/"),
}));

describe("/verify page", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    replaceMock.mockReset();
    dispatchAuthSuccessMock.mockReset();
    postMessageMock.mockReset();
    closeMock.mockReset();
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel as unknown as typeof BroadcastChannel);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("broadcasts once, shows the countdown, and redirects after five seconds", () => {
    render(<VerifyPage />);

    expect(dispatchAuthSuccessMock).toHaveBeenCalledTimes(1);
    expect(postMessageMock).toHaveBeenCalledTimes(1);
    expect(postMessageMock).toHaveBeenCalledWith({ type: "email_verified" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to my listing" }));
    expect(replaceMock).toHaveBeenCalledWith("/generator");
    expect(screen.getByText("Continuing automatically in 5s")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(replaceMock).toHaveBeenLastCalledWith("/generator");
  });
});
