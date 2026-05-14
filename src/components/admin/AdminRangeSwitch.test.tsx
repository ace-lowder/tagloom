import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminRangeSwitch from "@/components/admin/AdminRangeSwitch";

const replaceMock = vi.fn();
const pathnameMock = vi.fn();
const searchParamsMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => searchParamsMock(),
}));

describe("AdminRangeSwitch", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pathnameMock.mockReturnValue("/admin/usage");
    searchParamsMock.mockReturnValue(new URLSearchParams("range=1d&foo=bar"));
  });

  it("updates range while preserving existing query params", () => {
    render(<AdminRangeSwitch />);

    expect(screen.getByRole("button", { name: "1d" }).className).toContain("bg-primary");
    expect(screen.getByRole("button", { name: "7d" }).className).toContain("bg-white");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(replaceMock).toHaveBeenCalledWith("/admin/usage?range=7d&foo=bar");
  });
});
