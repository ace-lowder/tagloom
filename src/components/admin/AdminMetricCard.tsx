import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdminMetricComparison } from "@/lib/adminDashboard";

export default function AdminMetricCard({
  label,
  value,
  comparison = null,
  tone = "default",
}: {
  label: string;
  value: number | string;
  comparison?: AdminMetricComparison | null;
  tone?: "default" | "danger";
}) {
  const delta = comparison?.delta ?? 0;
  const percentChange = comparison?.percentChange ?? 0;
  const deltaTone =
    delta > 0 ? "text-green-700" : delta < 0 ? "text-red-600" : "text-ink-weak";

  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-ink-weak">{label}</p>
      {comparison ? (
        <div
          data-testid="admin-metric-value-area"
          className="mt-2 flex items-end justify-between gap-3"
        >
          <div className="inline-flex items-center gap-2">
            <p
              className={
                tone === "danger"
                  ? "text-2xl font-semibold text-danger"
                  : "text-2xl font-semibold text-ink"
              }
            >
              {value}
            </p>
            <p className={cn("text-sm font-semibold", deltaTone)}>
              {delta >= 0 ? "+" : ""}
              {delta}
            </p>
          </div>
          <p className={cn("pb-0.5 text-xs font-medium", deltaTone)}>
            {percentChange >= 0 ? "+" : ""}
            {percentChange}%
          </p>
        </div>
      ) : (
        <div className="mt-2">
          <p
            className={
              tone === "danger"
                ? "text-2xl font-semibold text-danger"
                : "text-2xl font-semibold text-ink"
            }
          >
            {value}
          </p>
        </div>
      )}
    </Card>
  );
}
