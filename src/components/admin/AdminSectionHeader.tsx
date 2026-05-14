import type { ReactNode } from "react";

export default function AdminSectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}
