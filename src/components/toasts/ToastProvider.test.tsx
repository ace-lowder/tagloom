import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "@/components/toasts/ToastProvider";
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
    </div>
  );
}

describe("ToastProvider", () => {
  it("shows success and error toasts", () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    fireEvent.click(screen.getByRole("button", { name: "Show error" }));

    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Your changes were saved.")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });

  it("dismisses a toast manually", () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show error" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Failed" }));

    expect(screen.queryByText("Failed")).not.toBeInTheDocument();
  });
});
