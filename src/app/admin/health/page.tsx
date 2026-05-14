import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminExportButton from "@/components/admin/AdminExportButton";
import AdminRowCopyButton from "@/components/admin/AdminRowCopyButton";
import AdminSectionHeader from "@/components/admin/AdminSectionHeader";
import AdminTable from "@/components/admin/AdminTable";
import { parseAdminSort } from "@/lib/adminTable";
import { formatTimestamp, getAdminHealthData, previewText } from "@/lib/adminDashboard";
import { parseAdminRange } from "@/lib/adminRange";

export default async function AdminHealthPage({
  searchParams,
}: {
  searchParams?: {
    range?: string | string[];
    errorSort?: string | string[];
    errorDirection?: string | string[];
    envSort?: string | string[];
    envDirection?: string | string[];
  };
}) {
  const range = parseAdminRange(searchParams?.range);
  const errorSort = parseAdminSort(
    searchParams?.errorSort,
    searchParams?.errorDirection,
    ["created_at", "source", "route", "method", "status", "code", "message"] as const,
  );
  const envSort = parseAdminSort(
    searchParams?.envSort,
    searchParams?.envDirection,
    ["key", "configured"] as const,
  );
  const result = await getAdminHealthData(range, errorSort, envSort);
  const { data } = result;

  return (
    <div className="space-y-6">
      {!result.ok ? <AdminEmptyState message={result.error} /> : null}

      <section>
        <AdminSectionHeader title="Recent Errors" action={<AdminExportButton payload={data.errorLogs} />} />
        <AdminTable
          columns="grid-cols-[minmax(170px,1fr)_minmax(140px,0.9fr)_130px_110px_minmax(260px,1.6fr)_170px_44px]"
          headers={[
            { label: "Source", key: "source" },
            { label: "Route", key: "route" },
            { label: "Method/Status", key: "method" },
            { label: "Code", key: "code" },
            { label: "Message", key: "message" },
            { label: "Created", key: "created_at" },
          ]}
          sort={errorSort}
          sortParam="errorSort"
          directionParam="errorDirection"
          basePath="/admin/health"
          searchParams={searchParams}
        >
          {data.errorLogs.map((row) => (
            <AdminTable.Row key={row.id} columns="grid-cols-[minmax(170px,1fr)_minmax(140px,0.9fr)_130px_110px_minmax(260px,1.6fr)_170px_44px]" className="group">
              <AdminTable.Cell>{row.source}</AdminTable.Cell>
              <AdminTable.Cell className="text-stone-500">{row.route ?? "-"}</AdminTable.Cell>
              <AdminTable.Cell>{row.method ?? "-"}/{row.status ?? "-"}</AdminTable.Cell>
              <AdminTable.Cell>{row.code ?? "-"}</AdminTable.Cell>
              <AdminTable.Cell className="text-stone-500">{previewText(row.message)}</AdminTable.Cell>
              <AdminTable.Cell className="whitespace-nowrap text-stone-500">{formatTimestamp(row.created_at)}</AdminTable.Cell>
              <AdminTable.Cell className="flex justify-end px-2 py-2"><AdminRowCopyButton payload={row} /></AdminTable.Cell>
            </AdminTable.Row>
          ))}
        </AdminTable>
      </section>

      <section>
        <AdminSectionHeader title="Environment Status" />
        <AdminTable
          columns="grid-cols-[minmax(360px,1fr)_130px_44px]"
          headers={[
            { label: "Key", key: "key" },
            { label: "Configured", key: "configured" },
          ]}
          sort={envSort}
          sortParam="envSort"
          directionParam="envDirection"
          basePath="/admin/health"
          searchParams={searchParams}
        >
          {data.env.map((row) => (
            <AdminTable.Row key={row.key} columns="grid-cols-[minmax(360px,1fr)_130px_44px]" className="group">
              <AdminTable.Cell>{row.key}</AdminTable.Cell>
              <AdminTable.Cell>{row.configured ? "yes" : "no"}</AdminTable.Cell>
              <AdminTable.Cell className="px-2 py-2">&nbsp;</AdminTable.Cell>
            </AdminTable.Row>
          ))}
        </AdminTable>
      </section>
    </div>
  );
}
