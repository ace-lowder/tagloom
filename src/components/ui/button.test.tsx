import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("uses the loading label as the accessible button name", () => {
    render(
      <Button isLoading loadingLabel="Updating...">
        Update password
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Updating..." })).toBeInTheDocument();
  });

  it("keeps original children in layout while hidden from accessibility", () => {
    render(
      <Button isLoading loadingLabel="Sending...">
        Send message
      </Button>,
    );

    const originalLabel = screen.getByText("Send message");
    expect(originalLabel).toBeInTheDocument();
    expect(originalLabel.closest("[aria-hidden='true']")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send message" })).not.toBeInTheDocument();
  });

  it("shows the shared spinner while loading", () => {
    render(
      <Button isLoading loadingLabel="Generating tags">
        Generate 13 tags
      </Button>,
    );

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("does not visually render the loading label as normal text", () => {
    render(
      <Button isLoading loadingLabel="Generating tags">
        Generate 13 tags
      </Button>,
    );

    expect(screen.queryByText("Generating tags")).not.toBeInTheDocument();
  });
});
