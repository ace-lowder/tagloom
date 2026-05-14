import { describe, expect, it } from "vitest";
import {
  buildOverviewCharts,
  getChartBucketCount,
  getSupabaseDashboardLink,
  sortEnvStatusRows,
} from "@/lib/adminDashboard";

describe("getSupabaseDashboardLink", () => {
  it("builds project dashboard url from supabase project url", () => {
    expect(getSupabaseDashboardLink("https://abcxyz.supabase.co")).toBe(
      "https://supabase.com/dashboard/project/abcxyz",
    );
  });

  it("falls back to generic dashboard when value is missing or invalid", () => {
    expect(getSupabaseDashboardLink(null)).toBe("https://supabase.com/dashboard");
    expect(getSupabaseDashboardLink("not-a-url")).toBe("https://supabase.com/dashboard");
  });
});

describe("chart buckets", () => {
  it("returns expected bucket counts", () => {
    expect(getChartBucketCount("1d")).toBe(24);
    expect(getChartBucketCount("7d")).toBe(7);
    expect(getChartBucketCount("30d")).toBe(30);
    expect(getChartBucketCount("all")).toBe(30);
  });

  it("builds deterministic chart buckets with fixed now and separates free/paid", () => {
    const fixedNow = new Date(2026, 3, 10, 12, 30, 0);

    const signupAtHour = new Date(2026, 3, 10, 10, 15, 0).toISOString();
    const generationFree = new Date(2026, 3, 10, 10, 20, 0).toISOString();
    const generationPaid = new Date(2026, 3, 10, 10, 35, 0).toISOString();

    const chart1d = buildOverviewCharts(
      "1d",
      [{ created_at: signupAtHour }],
      [
        { created_at: generationFree, entitlement_used: "free" },
        { created_at: generationPaid, entitlement_used: "single_use" },
      ],
      fixedNow,
    );

    expect(chart1d.signupChart).toHaveLength(24);
    expect(chart1d.signupChart.every((bucket) => !bucket.label.includes("AM") && !bucket.label.includes("PM"))).toBe(true);

    const totalSignups = chart1d.signupChart.reduce((sum, bucket) => sum + bucket.signups, 0);
    const totalFree = chart1d.generationChart.reduce((sum, bucket) => sum + bucket.free, 0);
    const totalPaid = chart1d.generationChart.reduce((sum, bucket) => sum + bucket.paid, 0);

    expect(totalSignups).toBe(1);
    expect(totalFree).toBe(1);
    expect(totalPaid).toBe(1);

    const chart30d = buildOverviewCharts("30d", [], [], fixedNow);
    expect(chart30d.signupChart).toHaveLength(30);
    expect(chart30d.signupChart.every((bucket) => /^\d{1,2}\/\d{1,2}$/.test(bucket.label))).toBe(true);

    const chartAll = buildOverviewCharts("all", [], [], fixedNow);
    expect(chartAll.signupChart).toHaveLength(30);
  });
});

describe("sortEnvStatusRows", () => {
  it("sorts environment rows in memory by key and configured", () => {
    const rows = [
      { key: "B_KEY", configured: false },
      { key: "A_KEY", configured: true },
    ];

    expect(sortEnvStatusRows(rows, { key: "key", direction: "asc" })[0]?.key).toBe("A_KEY");
    expect(sortEnvStatusRows(rows, { key: "configured", direction: "desc" })[0]?.configured).toBe(true);
  });
});
