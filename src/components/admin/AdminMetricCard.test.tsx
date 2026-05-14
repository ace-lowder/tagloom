import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminMetricCard from "@/components/admin/AdminMetricCard";

describe("AdminMetricCard", () => {
  it("renders main value", () => {
    render(<AdminMetricCard label="Signups" value={20} />);

    expect(screen.getByText("Signups")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("renders positive delta and percent", () => {
    render(
      <AdminMetricCard
        label="Feedback"
        value={20}
        comparison={{ current: 20, previous: 10, delta: 10, percentChange: 100 }}
      />,
    );

    expect(screen.getByText("+10")).toBeInTheDocument();
    expect(screen.getByText("+100%")).toBeInTheDocument();
    expect(screen.getByTestId("admin-metric-value-area")).toContainElement(
      screen.getByText("+10"),
    );
    expect(screen.getByTestId("admin-metric-value-area")).toContainElement(
      screen.getByText("+100%"),
    );
    const area = screen.getByTestId("admin-metric-value-area");
    expect(area.className).not.toContain("min-h-[2.6rem]");
    expect(screen.getByText("+100%").className).not.toContain("absolute");
  });

  it("renders negative delta and percent", () => {
    render(
      <AdminMetricCard
        label="Messages"
        value={0}
        comparison={{ current: 0, previous: 1, delta: -1, percentChange: -100 }}
      />,
    );

    expect(screen.getByText("-1")).toBeInTheDocument();
    expect(screen.getByText("-100%")).toBeInTheDocument();
  });

  it("omits comparison when null", () => {
    render(<AdminMetricCard label="Errors" value={5} comparison={null} />);

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });
});
