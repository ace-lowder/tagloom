import AdminShell from "@/components/admin/AdminShell";
import { requireAdminUser } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdminUser();
  return <AdminShell>{children}</AdminShell>;
}
