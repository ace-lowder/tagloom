import AdminBarChart from "@/components/admin/AdminBarChart";
import { AdminEmptyState, AdminExternalLinks } from "@/components/admin/AdminComponents";
import AdminMetricCard from "@/components/admin/AdminMetricCard";
import {
  getAdminOverviewData,
} from "@/lib/adminDashboard";
import { parseAdminRange } from "@/lib/adminRange";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams?: { range?: string | string[] };
}) {
  const range = parseAdminRange(searchParams?.range);
  const result = await getAdminOverviewData(range);
  const { data } = result;

  return (
    <div className="space-y-6">
      {!result.ok ? <AdminEmptyState message={result.error} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="Signups"
          value={data.counts.signups}
          comparison={data.comparison?.signups ?? null}
        />
        <AdminMetricCard
          label="Feedback"
          value={data.counts.feedback}
          comparison={data.comparison?.feedback ?? null}
        />
        <AdminMetricCard
          label="Messages"
          value={data.counts.messages}
          comparison={data.comparison?.messages ?? null}
        />
        <AdminMetricCard
          label="Errors"
          value={data.counts.errors}
          comparison={data.comparison?.errors ?? null}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminBarChart
          title="Signups"
          buckets={data.signupChart}
          series={[{ label: "Signups", dataKey: "signups", className: "bg-orange-400" }]}
        />
        <AdminBarChart
          title="Generations"
          buckets={data.generationChart}
          series={[
            { label: "Free", dataKey: "free", className: "bg-orange-300" },
            { label: "Paid", dataKey: "paid", className: "bg-orange-600" },
          ]}
        />
      </section>

      <section>
        <AdminExternalLinks links={data.externalLinks} />
      </section>
    </div>
  );
}
