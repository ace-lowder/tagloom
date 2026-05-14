import { Card } from "@/components/ui/card";

export default function AdminMetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "danger";
}) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-ink-weak">{label}</p>
      <p className={tone === "danger" ? "mt-2 text-2xl font-semibold text-danger" : "mt-2 text-2xl font-semibold text-ink"}>
        {value}
      </p>
    </Card>
  );
}
