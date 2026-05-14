import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminBarChart from "@/components/admin/AdminBarChart";
import type { AdminChartBucket } from "@/lib/adminDashboard";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="recharts-responsive">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="recharts-barchart">{children}</div>,
  CartesianGrid: () => <div data-testid="recharts-grid" />,
  XAxis: () => <div data-testid="recharts-xaxis" />,
  YAxis: () => <div data-testid="recharts-yaxis" />,
  Tooltip: () => <div data-testid="recharts-tooltip" />,
  Bar: ({ dataKey }: { dataKey: string }) => <div data-testid={`recharts-bar-${dataKey}`} />,
}));

const sampleBuckets: AdminChartBucket[] = [
  { label: "10", signups: 0, generations: 0, free: 0, paid: 0 },
  { label: "11", signups: 2, generations: 3, free: 1, paid: 2 },
];

describe("AdminBarChart", () => {
  // Regression guard: this component is rendered from a server component,
  // so series props must stay JSON-serializable (no function props).
  it("renders title and single-series chart without crashing", () => {
    render(
      <AdminBarChart
        title="Signups"
        buckets={sampleBuckets}
        series={[{ label: "Signups", dataKey: "signups", className: "bg-orange-400" }]}
      />, 
    );

    expect(screen.getByRole("heading", { name: "Signups" })).toBeInTheDocument();
    expect(screen.getByTestId("recharts-barchart")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-bar-Signups")).toBeInTheDocument();
  });

  it("renders two-series chart and series legends", () => {
    render(
      <AdminBarChart
        title="Generations"
        buckets={sampleBuckets}
        series={[
          { label: "Free", dataKey: "free", className: "bg-orange-300" },
          { label: "Paid", dataKey: "paid", className: "bg-orange-600" },
        ]}
      />,
    );

    expect(screen.getByTestId("recharts-bar-Free")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-bar-Paid")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });
});
