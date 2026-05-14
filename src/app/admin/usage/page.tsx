import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminRowCopyButton from "@/components/admin/AdminRowCopyButton";
import AdminSectionHeader from "@/components/admin/AdminSectionHeader";
import AdminTable from "@/components/admin/AdminTable";
import { parseAdminSort } from "@/lib/adminTable";
import { formatTimestamp, getAdminUsageData, previewText } from "@/lib/adminDashboard";
import { parseAdminRange } from "@/lib/adminRange";

const usageSortKeys = ["created_at", "title", "source", "entitlement_used"] as const;

export default async function AdminUsagePage({
  searchParams,
}: {
  searchParams?: { range?: string | string[]; sort?: string | string[]; direction?: string | string[] };
}) {
  const range = parseAdminRange(searchParams?.range);
  const sort = parseAdminSort(
    searchParams?.sort,
    searchParams?.direction,
    usageSortKeys,
  );
  const result = await getAdminUsageData(range, sort);
  const { data } = result;

  return (
    <div className="space-y-6">
      {!result.ok ? <AdminEmptyState message={result.error} /> : null}

      <section>
        <AdminSectionHeader title="Counts By Entitlement" />
        <AdminTable
          columns="grid-cols-[minmax(180px,1fr)_96px_44px]"
          headers={[{ label: "Entitlement" }, { label: "Count" }]}
          basePath="/admin/usage"
          searchParams={searchParams}
        >
          {data.byEntitlement.map((row) => (
            <AdminTable.Row key={row.label} columns="grid-cols-[minmax(180px,1fr)_96px_44px]" className="group">
              <AdminTable.Cell>{row.label}</AdminTable.Cell>
              <AdminTable.Cell>{row.count}</AdminTable.Cell>
              <AdminTable.Cell className="flex justify-end px-2 py-2"><AdminRowCopyButton payload={row} /></AdminTable.Cell>
            </AdminTable.Row>
          ))}
        </AdminTable>
      </section>

      <section>
        <AdminSectionHeader title="Recent Generations" />
        <AdminTable
          columns="grid-cols-[minmax(230px,1.4fr)_120px_136px_170px_44px]"
          headers={[
            { label: "Title", key: "title" },
            { label: "Source", key: "source" },
            { label: "Entitlement", key: "entitlement_used" },
            { label: "Created", key: "created_at" },
          ]}
          sort={sort}
          sortParam="sort"
          directionParam="direction"
          basePath="/admin/usage"
          searchParams={searchParams}
        >
          {data.recentGenerations.map((row) => (
            <AdminTable.Row key={row.id} columns="grid-cols-[minmax(230px,1.4fr)_120px_136px_170px_44px]" className="group">
              <AdminTable.Cell>{previewText(row.title, 70)}</AdminTable.Cell>
              <AdminTable.Cell>{row.source}</AdminTable.Cell>
              <AdminTable.Cell>{row.entitlement_used}</AdminTable.Cell>
              <AdminTable.Cell className="whitespace-nowrap text-stone-500">{formatTimestamp(row.created_at)}</AdminTable.Cell>
              <AdminTable.Cell className="flex justify-end px-2 py-2"><AdminRowCopyButton payload={row} /></AdminTable.Cell>
            </AdminTable.Row>
          ))}
        </AdminTable>
      </section>
    </div>
  );
}
