import type { AdminRange } from "@/lib/adminRange";
import type { AdminChartBucket } from "./dashboardTypes";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

type ChartMode = "24h" | "7d" | "30d";

function chartModeForRange(range: AdminRange): ChartMode {
  if (range === "1d") return "24h";
  if (range === "7d") return "7d";
  return "30d";
}

export function getChartBucketCount(range: AdminRange): number {
  if (range === "1d") return 24;
  if (range === "7d") return 7;
  return 30;
}

function buildChartBuckets(range: AdminRange, now = new Date()): AdminChartBucket[] {
  const mode = chartModeForRange(range);
  const count = getChartBucketCount(range);
  const buckets: AdminChartBucket[] = [];

  if (mode === "24h") {
    const endHour = new Date(now);
    endHour.setMinutes(0, 0, 0);

    for (let index = count - 1; index >= 0; index -= 1) {
      const date = new Date(endHour.getTime() - index * MS_HOUR);
      buckets.push({
        label: String(date.getHours()),
        signups: 0,
        generations: 0,
        free: 0,
        paid: 0,
      });
    }

    return buckets;
  }

  const endDay = new Date(now);
  endDay.setHours(0, 0, 0, 0);

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(endDay.getTime() - index * MS_DAY);
    buckets.push({
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      signups: 0,
      generations: 0,
      free: 0,
      paid: 0,
    });
  }

  return buckets;
}

function chartKeyForDate(iso: string, mode: ChartMode): string {
  const date = new Date(iso);
  if (mode === "24h") {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  }
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function chartKeyForBucketIndex(index: number, range: AdminRange, now: Date): string {
  const mode = chartModeForRange(range);

  if (mode === "24h") {
    const endHour = new Date(now);
    endHour.setMinutes(0, 0, 0);
    const bucketTime = new Date(
      endHour.getTime() - (getChartBucketCount(range) - 1 - index) * MS_HOUR,
    );
    return `${bucketTime.getFullYear()}-${bucketTime.getMonth()}-${bucketTime.getDate()}-${bucketTime.getHours()}`;
  }

  const endDay = new Date(now);
  endDay.setHours(0, 0, 0, 0);
  const bucketTime = new Date(
    endDay.getTime() - (getChartBucketCount(range) - 1 - index) * MS_DAY,
  );
  return `${bucketTime.getFullYear()}-${bucketTime.getMonth()}-${bucketTime.getDate()}`;
}

export function buildOverviewCharts(
  range: AdminRange,
  signups: Array<{ created_at: string }>,
  generations: Array<{ created_at: string; entitlement_used: string | null }>,
  now = new Date(),
): { signupChart: AdminChartBucket[]; generationChart: AdminChartBucket[] } {
  const signupChart = buildChartBuckets(range, now);
  const generationChart = buildChartBuckets(range, now);
  const bucketMap = new Map<string, number>();

  for (let index = 0; index < signupChart.length; index += 1) {
    bucketMap.set(chartKeyForBucketIndex(index, range, now), index);
  }

  const mode = chartModeForRange(range);

  for (const row of signups) {
    const index = bucketMap.get(chartKeyForDate(row.created_at, mode));
    if (index === undefined) continue;
    signupChart[index].signups += 1;
  }

  for (const row of generations) {
    const index = bucketMap.get(chartKeyForDate(row.created_at, mode));
    if (index === undefined) continue;

    generationChart[index].generations += 1;
    if ((row.entitlement_used ?? "").toLowerCase() === "free") {
      generationChart[index].free += 1;
    } else {
      generationChart[index].paid += 1;
    }
  }

  return { signupChart, generationChart };
}
