import AdminCopyButton from "@/components/admin/AdminCopyButton";

export default function AdminExportButton({ payload }: { payload: unknown }) {
  return <AdminCopyButton payload={payload} label="Export JSON" ariaLabel="Export JSON" />;
}
