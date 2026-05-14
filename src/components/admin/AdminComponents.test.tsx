import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminCopyButton, AdminRowCopyButton } from "@/components/admin/AdminComponents";

describe("admin copy controls", () => {
  it("copies compact JSON payload", async () => {
    render(<AdminCopyButton payload={{ id: "a1", status: "sent" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy JSON" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '{"id":"a1","status":"sent"}',
      );
    });
  });

  it("row copy button exposes accessible label", () => {
    render(<AdminRowCopyButton payload={{ id: "row-1" }} />);

    const button = screen.getByRole("button", { name: "Copy row JSON" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("h-8", "w-8", "bg-transparent");
    expect(button.className).not.toMatch(/\bborder\b/);
  });
});
