import React from "react";
import { cn } from "@/lib/utils";

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white/70",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DataTableHeader({
  columns,
  children,
  className,
}: {
  columns: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid shrink-0 border-b border-stone-200 text-left text-[11px] font-semibold uppercase text-stone-500",
        columns,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DataTableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-3 py-2.5", className)}>{children}</div>;
}

export function DataTableHeaderButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-full w-full min-w-0 items-center gap-1 bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-stone-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-300/70",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DataTableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("min-h-0 flex-1 overflow-auto", className)}>{children}</div>;
}

export function DataTableRow({
  columns,
  children,
  className,
}: {
  columns: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full items-center border-b border-stone-100 text-left text-sm transition-colors last:border-b-0 hover:bg-orange-50/60",
        columns,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DataTableCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("truncate px-3 py-3", className)}>{children}</div>;
}

export function DataTableEmptyRow({
  columns,
  message,
}: {
  columns: string;
  message: string;
}) {
  return (
    <DataTableRow columns={columns} className="hover:bg-transparent">
      <div className="col-span-full px-4 py-3 text-center text-sm text-stone-500">{message}</div>
    </DataTableRow>
  );
}
