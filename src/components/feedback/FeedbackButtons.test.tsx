import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FeedbackButtons from "./FeedbackButtons";

describe("FeedbackButtons", () => {
  it("reflects active up/down state via aria-pressed", () => {
    const onUp = vi.fn();
    const onDown = vi.fn();
    const { rerender } = render(
      <FeedbackButtons rating={null} onUp={onUp} onDown={onDown} />,
    );

    expect(screen.getByLabelText("Thumbs up")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Thumbs down")).toHaveAttribute("aria-pressed", "false");

    rerender(<FeedbackButtons rating="up" onUp={onUp} onDown={onDown} />);
    expect(screen.getByLabelText("Thumbs up")).toHaveAttribute("aria-pressed", "true");

    rerender(<FeedbackButtons rating="down" onUp={onUp} onDown={onDown} />);
    expect(screen.getByLabelText("Thumbs down")).toHaveAttribute("aria-pressed", "true");
  });

  it("renders icon-only controls and blocks clicks while disabled", () => {
    const onUp = vi.fn();
    const onDown = vi.fn();
    render(<FeedbackButtons rating={null} disabled onUp={onUp} onDown={onDown} />);
    const upButton = screen.getByLabelText("Thumbs up");
    const downButton = screen.getByLabelText("Thumbs down");

    expect(screen.queryByText("Thumbs up")).not.toBeInTheDocument();
    expect(screen.queryByText("Thumbs down")).not.toBeInTheDocument();
    expect(upButton.parentElement).toHaveClass("gap-1");
    expect(upButton).toHaveClass("px-2", "h-6");
    expect(downButton).toHaveClass("px-2", "h-6");

    fireEvent.click(upButton);
    fireEvent.click(downButton);
    expect(onUp).not.toHaveBeenCalled();
    expect(onDown).not.toHaveBeenCalled();
  });
});
