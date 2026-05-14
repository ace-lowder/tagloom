"use client";

import { Card } from "@/components/ui/card";
import type { AdminChartBucket } from "@/lib/adminDashboard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AdminChartDataKey = "signups" | "free" | "paid";

type ChartSeries = {
  label: string;
  dataKey: AdminChartDataKey;
  className: string;
};

type ChartRow = {
  label: string;
  [key: string]: string | number;
};

function seriesColor(className: string) {
  if (className.includes("orange-300")) return "#fdba74";
  if (className.includes("orange-400")) return "#fb923c";
  if (className.includes("orange-600")) return "#ea580c";
  return "#f97316";
}

export default function AdminBarChart({
  title,
  buckets,
  series,
}: {
  title: string;
  buckets: AdminChartBucket[];
  series: ChartSeries[];
}) {
  const chartRows: ChartRow[] = buckets.map((bucket) => {
    const row: ChartRow = { label: bucket.label };

    for (const item of series) {
      row[item.label] = bucket[item.dataKey];
    }

    return row;
  });

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-3 h-[290px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows} margin={{ top: 8, right: 10, left: 0, bottom: 14 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#78716c", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#d6d3d1" }}
              interval="preserveStartEnd"
              minTickGap={14}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#78716c", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#d6d3d1" }}
              width={32}
            />
            <Tooltip
              cursor={{ fill: "rgba(251, 146, 60, 0.12)" }}
              contentStyle={{
                borderRadius: "0.75rem",
                borderColor: "#e7e5e4",
                fontSize: "12px",
              }}
            />
            {series.map((item) => (
              <Bar
                key={item.label}
                dataKey={item.label}
                name={item.label}
                fill={seriesColor(item.className)}
                stackId={series.length > 1 ? "combined" : undefined}
                radius={[4, 4, 0, 0]}
                minPointSize={3}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-weak">
        {series.map((item) => (
          <div key={item.label} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: seriesColor(item.className) }} />
            {item.label}
          </div>
        ))}
      </div>
    </Card>
  );
}
