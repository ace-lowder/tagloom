import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DANGER_TOAST_MS,
  DEFAULT_TOAST_MS,
  MAX_TOASTS,
  TOAST_EXIT_MS,
  ToastProvider,
} from "@/components/toasts/ToastProvider";
import { useToast } from "@/components/toasts/toasts";

function ToastHarness() {
  const { showToast } = useToast();

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          showToast({
            title: "Saved",
            body: "Your changes were saved.",
            type: "success",
          })
        }
      >
        Show success
      </button>
      <button
        type="button"
        onClick={() =>
          showToast({
            title: "Failed",
            body: "Something went wrong.",
            type: "danger",
          })
        }
      >
        Show error
      </button>
      <button
        type="button"
        onClick={() =>
          showToast({
            title: "Heads up",
            body: "Useful context.",
            type: "info",
          })
        }
      >
        Show info
      </button>
      <button
        type="button"
        onClick={() => {
          for (let index = 1; index <= MAX_TOASTS + 1; index += 1) {
            showToast({
              title: `Toast ${index}`,
              type: "info",
            });
          }
        }}
      >
        Show many
      </button>
    </div>
  );
}

function renderToasts() {
  return render(
    <ToastProvider>
      <ToastHarness />
    </ToastProvider>,
  );
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("shows success and danger toasts", () => {
    renderToasts();

    fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    fireEvent.click(screen.getByRole("button", { name: "Show error" }));

    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Your changes were saved.")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });

  it("manual dismiss starts exit and removes after the exit duration", async () => {
    renderToasts();

    fireEvent.click(screen.getByRole("button", { name: "Show error" }));
    const toast = screen.getByRole("status");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss Failed" }));

    expect(toast).toHaveAttribute("data-status", "exiting-manual");
    expect(screen.getByText("Failed")).toBeInTheDocument();

    await advance(TOAST_EXIT_MS);

    expect(screen.queryByText("Failed")).not.toBeInTheDocument();
  });

  it("auto-dismiss duration differs for danger and success/info", async () => {
    renderToasts();

    fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    fireEvent.click(screen.getByRole("button", { name: "Show error" }));

    await advance(DEFAULT_TOAST_MS);

    expect(screen.getByText("Saved").closest("[role='status']")).toHaveAttribute(
      "data-status",
      "exiting",
    );
    expect(screen.getByText("Failed")).toBeInTheDocument();

    await advance(TOAST_EXIT_MS);

    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();

    await advance(DANGER_TOAST_MS - DEFAULT_TOAST_MS - TOAST_EXIT_MS + 1);

    expect(screen.getByText("Failed").closest("[role='status']")).toHaveAttribute(
      "data-status",
      "exiting",
    );
  });

  it("hover and focus pause then resume auto-dismiss", async () => {
    renderToasts();

    fireEvent.click(screen.getByRole("button", { name: "Show info" }));
    const toast = screen.getByRole("status");

    await advance(4000);
    fireEvent.mouseEnter(toast);
    await advance(DEFAULT_TOAST_MS);
    expect(screen.getByText("Heads up")).toBeInTheDocument();

    fireEvent.mouseLeave(toast);
    await advance(DEFAULT_TOAST_MS - 4000);
    expect(toast).toHaveAttribute("data-status", "exiting");
    await advance(TOAST_EXIT_MS);

    fireEvent.click(screen.getByRole("button", { name: "Show info" }));
    const focusedToast = screen.getByRole("status");
    fireEvent.focus(focusedToast);
    await advance(DEFAULT_TOAST_MS);
    expect(screen.getByText("Heads up")).toBeInTheDocument();
    fireEvent.blur(focusedToast);
    await advance(DEFAULT_TOAST_MS);
    expect(focusedToast).toHaveAttribute("data-status", "exiting");
  });

  it("exits the oldest visible toast when max visible count is exceeded", async () => {
    renderToasts();

    fireEvent.click(screen.getByRole("button", { name: "Show many" }));

    expect(screen.getByText("Toast 1").closest("[role='status']")).toHaveAttribute(
      "data-status",
      "exiting",
    );
    expect(screen.getAllByRole("status")).toHaveLength(MAX_TOASTS + 1);

    await advance(TOAST_EXIT_MS);

    expect(screen.queryByText("Toast 1")).not.toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(MAX_TOASTS);
  });

  it("repositions remaining toasts immediately when one exits", async () => {
    renderToasts();

    fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    fireEvent.click(screen.getByRole("button", { name: "Show info" }));

    const firstToast = screen.getByText("Saved").closest("[role='status']");
    const secondToast = screen.getByText("Heads up").closest("[role='status']");

    expect(firstToast).toHaveAttribute("data-stack-offset", "0");
    expect(secondToast).not.toHaveAttribute("data-stack-offset", "0");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss Saved" }));

    expect(firstToast).toHaveAttribute("data-status", "exiting-manual");
    expect(firstToast).toHaveAttribute("data-stack-offset", "0");
    expect(secondToast).toHaveAttribute("data-stack-offset", "0");
  });
});
