import { ThumbsDown, ThumbsUp } from "lucide-react";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminExportButton from "@/components/admin/AdminExportButton";
import AdminRowCopyButton from "@/components/admin/AdminRowCopyButton";
import AdminSectionHeader from "@/components/admin/AdminSectionHeader";
import AdminTable from "@/components/admin/AdminTable";
import { parseAdminSort } from "@/lib/adminTable";
import { formatTimestamp, getAdminFeedbackData, previewText } from "@/lib/adminDashboard";
import { parseAdminRange } from "@/lib/adminRange";

const generationSortKeys = ["created_at", "rating", "title_snapshot", "note"] as const;
const articleSortKeys = ["created_at", "rating", "article_slug", "note"] as const;

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams?: {
    range?: string | string[];
    generationSort?: string | string[];
    generationDirection?: string | string[];
    articleSort?: string | string[];
    articleDirection?: string | string[];
  };
}) {
  const range = parseAdminRange(searchParams?.range);
  const generationSort = parseAdminSort(
    searchParams?.generationSort,
    searchParams?.generationDirection,
    generationSortKeys,
  );
  const articleSort = parseAdminSort(
    searchParams?.articleSort,
    searchParams?.articleDirection,
    articleSortKeys,
  );
  const result = await getAdminFeedbackData(range, generationSort, articleSort);
  const { data } = result;

  return (
    <div className="space-y-6">
      {!result.ok ? <AdminEmptyState message={result.error} /> : null}

      <section>
        <AdminSectionHeader
          title="Generation Feedback"
          action={<AdminExportButton payload={data.generationFeedback} />}
        />
        <AdminTable
          columns="grid-cols-[74px_minmax(170px,0.9fr)_minmax(320px,1.7fr)_170px]"
          headers={[
            { label: "Rating", key: "rating" },
            { label: "Title", key: "title_snapshot" },
            { label: "Note", key: "note" },
            { label: "Created", key: "created_at" },
          ]}
          sort={generationSort}
          sortParam="generationSort"
          directionParam="generationDirection"
          basePath="/admin/feedback"
          searchParams={searchParams}
        >
          {data.generationFeedback.map((row) => (
            <AdminTable.Row key={row.id} columns="grid-cols-[74px_minmax(170px,0.9fr)_minmax(320px,1.7fr)_170px]" className="group">
              <AdminTable.Cell>
                {row.rating === "up" ? <ThumbsUp className="h-4 w-4 text-green-600" /> : <ThumbsDown className="h-4 w-4 text-orange-700" />}
              </AdminTable.Cell>
              <AdminTable.Cell>{previewText(row.title_snapshot, 60)}</AdminTable.Cell>
              <AdminTable.Cell className="text-stone-500">{previewText(row.note, 220)}</AdminTable.Cell>
              <AdminTable.Cell className="relative whitespace-nowrap pr-12 text-stone-500">
                {formatTimestamp(row.created_at)}
                <AdminRowCopyButton payload={row} />
              </AdminTable.Cell>
            </AdminTable.Row>
          ))}
        </AdminTable>
      </section>

      <section>
        <AdminSectionHeader
          title="Support Article Feedback"
          action={<AdminExportButton payload={data.supportArticleFeedback} />}
        />
        <AdminTable
          columns="grid-cols-[74px_minmax(190px,1fr)_minmax(260px,1.5fr)_170px]"
          headers={[
            { label: "Rating", key: "rating" },
            { label: "Article", key: "article_slug" },
            { label: "Note", key: "note" },
            { label: "Created", key: "created_at" },
          ]}
          sort={articleSort}
          sortParam="articleSort"
          directionParam="articleDirection"
          basePath="/admin/feedback"
          searchParams={searchParams}
        >
          {data.supportArticleFeedback.map((row) => (
            <AdminTable.Row key={row.id} columns="grid-cols-[74px_minmax(190px,1fr)_minmax(260px,1.5fr)_170px]" className="group">
              <AdminTable.Cell>
                {row.rating === "up" ? <ThumbsUp className="h-4 w-4 text-green-600" /> : <ThumbsDown className="h-4 w-4 text-orange-700" />}
              </AdminTable.Cell>
              <AdminTable.Cell>{row.article_slug}</AdminTable.Cell>
              <AdminTable.Cell className="text-stone-500">{previewText(row.note)}</AdminTable.Cell>
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
