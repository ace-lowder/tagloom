import { describe, expect, it } from "vitest";
import {
  buildOverviewCharts,
  calculateAdminMetricComparison,
  getChartBucketCount,
  getAdminComparisonWindow,
  getSupabaseDashboardLink,
  sortEntitlementCounts,
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

describe("sortEntitlementCounts", () => {
  const rows = [
    { label: "monthly", count: 4 },
    { label: "free", count: 10 },
    { label: "single_use", count: 2 },
  ];

  it("defaults can use count desc ordering", () => {
    const sorted = sortEntitlementCounts(rows, { key: "count", direction: "desc" });
    expect(sorted.map((row) => row.label)).toEqual(["free", "monthly", "single_use"]);
  });

  it("sorts by label asc", () => {
    const sorted = sortEntitlementCounts(rows, { key: "label", direction: "asc" });
    expect(sorted.map((row) => row.label)).toEqual(["free", "monthly", "single_use"]);
  });

  it("sorts by count asc", () => {
    const sorted = sortEntitlementCounts(rows, { key: "count", direction: "asc" });
    expect(sorted.map((row) => row.count)).toEqual([2, 4, 10]);
  });
});

describe("comparison helpers", () => {
  it("calculates metric deltas and percent changes", () => {
    expect(calculateAdminMetricComparison(20, 10)).toMatchObject({
      delta: 10,
      percentChange: 100,
    });
    expect(calculateAdminMetricComparison(0, 1)).toMatchObject({
      delta: -1,
      percentChange: -100,
    });
    expect(calculateAdminMetricComparison(1, 0)).toMatchObject({
      delta: 1,
      percentChange: 100,
    });
    expect(calculateAdminMetricComparison(0, 0)).toMatchObject({
      delta: 0,
      percentChange: 0,
    });
  });

  it("builds comparison windows for rolling ranges and no window for all", () => {
    const now = new Date("2026-05-14T12:00:00.000Z");

    const window1d = getAdminComparisonWindow("1d", now);
    const window7d = getAdminComparisonWindow("7d", now);
    const window30d = getAdminComparisonWindow("30d", now);

    expect(window1d).not.toBeNull();
    expect(window7d).not.toBeNull();
    expect(window30d).not.toBeNull();
    expect(getAdminComparisonWindow("all", now)).toBeNull();

    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDayMs = 7 * oneDayMs;
    const thirtyDayMs = 30 * oneDayMs;

    expect(
      new Date(window1d!.currentEnd).getTime() -
        new Date(window1d!.currentStart).getTime(),
    ).toBe(oneDayMs);
    expect(
      new Date(window7d!.currentEnd).getTime() -
        new Date(window7d!.currentStart).getTime(),
    ).toBe(sevenDayMs);
    expect(
      new Date(window30d!.currentEnd).getTime() -
        new Date(window30d!.currentStart).getTime(),
    ).toBe(thirtyDayMs);
  });
});
