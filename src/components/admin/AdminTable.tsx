import React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyRow,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import {
  getNextAdminSortState,
  type AdminSortState,
} from "@/lib/adminTable";

export type AdminTableHeader = {
  label: string;
  key?: string;
  className?: string;
};

function normalizeSearchParams(
  value: Record<string, string | string[] | undefined> | undefined,
): URLSearchParams {
  const params = new URLSearchParams();
  if (!value) return params;

  for (const [key, rawValue] of Object.entries(value)) {
    if (Array.isArray(rawValue)) {
      for (const item of rawValue) params.append(key, item);
    } else if (typeof rawValue === "string") {
      params.set(key, rawValue);
    }
  }

  return params;
}

function buildSortHref({
  basePath,
  searchParams,
  sort,
  sortParam,
  directionParam,
  key,
}: {
  basePath: string;
  searchParams?: Record<string, string | string[] | undefined>;
  sort: AdminSortState<string>;
  sortParam: string;
  directionParam: string;
  key: string;
}) {
  const params = normalizeSearchParams(searchParams);
  const nextSort = getNextAdminSortState(sort, key);

  if (nextSort) {
    params.set(sortParam, nextSort.key);
    params.set(directionParam, nextSort.direction);
  } else {
    params.delete(sortParam);
    params.delete(directionParam);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function AdminTableRoot({
  headers,
  children,
  columns,
  emptyMessage = "No entries found.",
  sort = null,
  sortParam = "sort",
  directionParam = "direction",
  basePath,
  searchParams,
}: {
  headers: AdminTableHeader[];
  children: React.ReactNode;
  columns: string;
  emptyMessage?: string;
  sort?: AdminSortState<string>;
  sortParam?: string;
  directionParam?: string;
  basePath?: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const hasRows = React.Children.count(children) > 0;

  return (
    <DataTable>
      <DataTableHeader columns={columns}>
        {headers.map((header) => {
          const isSortable = Boolean(header.key && basePath);
          const isActive = Boolean(sort && header.key && sort.key === header.key);

          if (!isSortable || !header.key || !basePath) {
            return (
              <DataTableHeaderCell key={header.label} className={header.className}>
                <span className="truncate">{header.label}</span>
              </DataTableHeaderCell>
            );
          }

          const href = buildSortHref({
            basePath,
            searchParams,
            sort,
            sortParam,
            directionParam,
            key: header.key,
          });

          return (
            <Link
              key={header.label}
              href={href}
              className={[
                "flex h-full w-full min-w-0 items-center gap-1 bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-stone-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-300/70",
                header.className ?? "",
              ].join(" ")}
              aria-sort={
                isActive
                  ? sort?.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <span className="truncate">{header.label}</span>
              {isActive ? (
                sort?.direction === "asc" ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" />
                )
              ) : null}
            </Link>
          );
        })}
      </DataTableHeader>

      <DataTableBody>
        {hasRows ? children : <DataTableEmptyRow columns={columns} message={emptyMessage} />}
      </DataTableBody>
    </DataTable>
  );
}

function AdminTableRow({
  columns,
  className,
  children,
}: {
  columns: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <DataTableRow columns={columns} className={className}>
      {children}
    </DataTableRow>
  );
}

function AdminTableCell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <DataTableCell className={className}>{children}</DataTableCell>;
}

const AdminTable = Object.assign(AdminTableRoot, {
  Row: AdminTableRow,
  Cell: AdminTableCell,
});

export default AdminTable;
