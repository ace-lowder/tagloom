import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FeedbackModal from "./FeedbackModal";

describe("FeedbackModal", () => {
  it("renders with animation wrappers and no Cancel button", () => {
    render(
      <FeedbackModal
        open
        title="Tell us what went wrong"
        placeholder="Please tell us what went wrong with these tags so we can improve future tags."
        onCloseWithoutNote={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toHaveClass("w-full");
    expect(screen.queryByText("0/1000")).not.toBeInTheDocument();
  });

  it("uses caller placeholder, submits note, and closes without note from backdrop", () => {
    const onSubmit = vi.fn();
    const onCloseWithoutNote = vi.fn();
    render(
      <FeedbackModal
        open
        title="Tell us what went wrong"
        placeholder="Please tell us what was unhelpful so we can improve this article."
        onCloseWithoutNote={onCloseWithoutNote}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText(
        "Please tell us what was unhelpful so we can improve this article.",
      ),
      { target: { value: "Needs clearer steps" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith("Needs clearer steps");

    fireEvent.click(screen.getByRole("button", { name: "Close feedback modal" }));
    expect(onCloseWithoutNote).toHaveBeenCalledTimes(1);
  });
});
