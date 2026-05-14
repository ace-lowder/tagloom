import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminExportButton from "@/components/admin/AdminExportButton";
import AdminRowCopyButton from "@/components/admin/AdminRowCopyButton";
import AdminSectionHeader from "@/components/admin/AdminSectionHeader";
import AdminTable from "@/components/admin/AdminTable";
import { parseAdminSort } from "@/lib/adminTable";
import { formatTimestamp, getAdminSupportData, previewText } from "@/lib/adminDashboard";
import { parseAdminRange } from "@/lib/adminRange";

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams?: { range?: string | string[]; sort?: string | string[]; direction?: string | string[] };
}) {
  const range = parseAdminRange(searchParams?.range);
  const sort = parseAdminSort(
    searchParams?.sort,
    searchParams?.direction,
    ["created_at", "status", "email", "name", "subject", "message"] as const,
  );
  const result = await getAdminSupportData(range, sort);
  const { data } = result;

  return (
    <div className="space-y-6">
      {!result.ok ? <AdminEmptyState message={result.error} /> : null}

      <section>
        <AdminSectionHeader
          title="Support Messages"
          action={<AdminExportButton payload={data.supportMessages} />}
        />
        <AdminTable
          columns="grid-cols-[86px_minmax(180px,1fr)_minmax(140px,0.9fr)_minmax(180px,1fr)_minmax(260px,1.6fr)_170px]"
          headers={[
            { label: "Status", key: "status" },
            { label: "Email", key: "email" },
            { label: "Name", key: "name" },
            { label: "Subject", key: "subject" },
            { label: "Message", key: "message" },
            { label: "Created", key: "created_at" },
          ]}
          sort={sort}
          sortParam="sort"
          directionParam="direction"
          basePath="/admin/support"
          searchParams={searchParams}
        >
          {data.supportMessages.map((row) => (
            <AdminTable.Row key={row.id} columns="grid-cols-[86px_minmax(180px,1fr)_minmax(140px,0.9fr)_minmax(180px,1fr)_minmax(260px,1.6fr)_170px]" className="group">
              <AdminTable.Cell>{row.status}</AdminTable.Cell>
              <AdminTable.Cell>{row.email}</AdminTable.Cell>
              <AdminTable.Cell>{row.name ?? "-"}</AdminTable.Cell>
              <AdminTable.Cell>{previewText(row.subject, 80)}</AdminTable.Cell>
              <AdminTable.Cell className="text-stone-500">{previewText(row.message)}</AdminTable.Cell>
              <AdminTable.Cell className="relative whitespace-nowrap pr-12 text-stone-500">
                {formatTimestamp(row.created_at)}
                <AdminRowCopyButton payload={row} />
              </AdminTable.Cell>
            </AdminTable.Row>
          ))}
        </AdminTable>
      </section>
    </div>
  );
}
