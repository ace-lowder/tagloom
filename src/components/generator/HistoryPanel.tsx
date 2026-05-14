"use client";

import { Archive, ArrowDown, ArrowUp, Clock, RotateCcw, X } from "lucide-react";

import { cn } from "@/lib/utils";

// === Components ===

export function HistoryPanel({
  items,
  selectedDraftId,
  selectedGeneratedId,
  showArchived,
  sortState,
  onArchiveGeneration,
  onRestoreGeneration,
  onDeleteDraft,
  onSelectItem,
  onSortHeaderClick,
}: HistoryPanelProps) {
  const visibleItems = sortHistoryItems(
    showArchived ? items : items.filter((item) => !item.archivedAt),
    sortState,
  );

  return (
    <div
      data-testid="generation-history-panel"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white/70"
    >
      <div className="grid shrink-0 grid-cols-[118px_minmax(130px,1.1fr)_minmax(150px,1.5fr)_92px_48px] border-b border-stone-200 text-left text-[11px] font-semibold uppercase text-stone-500">
        <HistoryHeaderButton
          label="Date"
          sortKey="date"
          sortState={sortState}
          onClick={onSortHeaderClick}
        />
        <HistoryHeaderButton
          label="Title"
          sortKey="title"
          sortState={sortState}
          onClick={onSortHeaderClick}
        />
        <HistoryHeaderButton
          label="Description"
          sortKey="description"
          sortState={sortState}
          onClick={onSortHeaderClick}
        />
        <HistoryHeaderButton
          label="Status"
          sortKey="status"
          sortState={sortState}
          showArchived={showArchived}
          onClick={onSortHeaderClick}
          className="col-span-2"
        />
      </div>

      {visibleItems.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const status = getHistoryStatus(item);
            const isSelected = item.isDraft
              ? selectedDraftId === item.id
              : selectedGeneratedId === item.id;
            return (
              <div
                key={`${status}-${item.id}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectItem(item)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onSelectItem(item);
                }}
                className={cn(
                  "grid w-full grid-cols-[118px_minmax(130px,1.1fr)_minmax(150px,1.5fr)_92px_48px] items-center border-b border-stone-100 text-left text-sm transition-colors last:border-b-0 hover:bg-orange-50/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-300/70",
                  isSelected && "bg-orange-50",
                )}
              >
                <span className="truncate px-3 py-3 text-xs font-medium text-stone-500">
                  {formatHistoryDate(item.createdAt)}
                </span>
                <span className="truncate px-3 py-3 font-semibold text-stone-800">
                  {item.title.trim() || "Untitled listing"}
                </span>
                <span className="truncate px-3 py-3 text-stone-600">
                  {item.description.trim() || "No description yet"}
                </span>
                <span className="px-3 py-3">
                  <StatusPill status={status} />
                </span>
                <span className="flex justify-end px-2 py-2">
                  <RowAction
                    item={item}
                    status={status}
                    onArchiveGeneration={onArchiveGeneration}
                    onRestoreGeneration={onRestoreGeneration}
                    onDeleteDraft={onDeleteDraft}
                  />
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Clock className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-stone-800">
            No generation history
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Generate tags and view your past generations here.
          </p>
        </div>
      )}
    </div>
  );
}

function HistoryHeaderButton({
  label,
  onClick,
  showArchived = false,
  sortKey,
  sortState,
  className,
}: {
  label: string;
  onClick: (key: HistorySortKey) => void;
  showArchived?: boolean;
  sortKey: HistorySortKey;
  sortState: HistorySortState;
  className?: string;
}) {
  const isActive = sortState?.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={cn(
        "flex h-full w-full min-w-0 items-center gap-1 bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-stone-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-300/70",
        className,
      )}
    >
      <span className="truncate">{label}</span>
      {isActive ? (
        sortState?.direction === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )
      ) : null}
      {sortKey === "status" && showArchived ? (
        <Archive className="h-3 w-3 translate-x-0.5 text-stone-500" />
      ) : null}
    </button>
  );
}

function StatusPill({ status }: { status: GenerationHistoryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize leading-none",
        status === "draft" && "bg-blue-50 text-blue-700",
        status === "generated" && "bg-green-50 text-green-700",
        status === "archived" && "bg-red-50 text-red-700",
      )}
    >
      {status}
    </span>
  );
}

function RowAction({
  item,
  onArchiveGeneration,
  onRestoreGeneration,
  onDeleteDraft,
  status,
}: {
  item: GenerationHistoryItem;
  onArchiveGeneration: (item: GenerationHistoryItem) => void;
  onRestoreGeneration: (item: GenerationHistoryItem) => void;
  onDeleteDraft: (item: GenerationHistoryItem) => void;
  status: GenerationHistoryStatus;
}) {
  const isDraft = status === "draft";
  const isArchived = status === "archived";
  const label = isDraft
    ? "Delete draft"
    : isArchived
      ? "Restore generation"
      : "Archive generation";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        if (isDraft) {
          onDeleteDraft(item);
          return;
        }
        if (isArchived) {
          onRestoreGeneration(item);
          return;
        }
        onArchiveGeneration(item);
      }}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-stone-500 transition-colors hover:bg-orange-100 hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300/70"
    >
      {isDraft ? (
        <X className="h-3.5 w-3.5" />
      ) : isArchived ? (
        <RotateCcw className="h-3.5 w-3.5" />
      ) : (
        <Archive className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// === Helpers ===

export function getHistoryStatus(
  item: GenerationHistoryItem,
): GenerationHistoryStatus {
  if (item.isDraft) return "draft";
  if (item.archivedAt) return "archived";
  return "generated";
}

function sortHistoryItems(
  items: GenerationHistoryItem[],
  sortState: HistorySortState,
) {
  const sorted = [...items];
  if (!sortState) {
    return sorted.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  const direction = sortState.direction === "asc" ? 1 : -1;
  return sorted.sort((a, b) => {
    if (sortState.key === "date") {
      return (
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
        direction
      );
    }
    if (sortState.key === "status") {
      return getHistoryStatus(a).localeCompare(getHistoryStatus(b)) * direction;
    }

    return (
      String(a[sortState.key] ?? "").localeCompare(
        String(b[sortState.key] ?? ""),
        undefined,
        { sensitivity: "base" },
      ) * direction
    );
  });
}

function formatHistoryDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// === Types ===

export type GenerationHistoryStatus = "draft" | "generated" | "archived";

export type GenerationHistoryItem = {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  targetTags: string[];
  discoveryTags: string[];
  archivedAt?: string | null;
  isDraft?: boolean;
  feedback?: { rating: "up" | "down"; note: string | null } | null;
};

export type HistoryMode = "generator" | "history";
export type HistorySortKey = "date" | "title" | "description" | "status";
export type HistorySortDirection = "asc" | "desc";
export type HistorySortState = {
  key: HistorySortKey;
  direction: HistorySortDirection;
} | null;

type HistoryPanelProps = {
  items: GenerationHistoryItem[];
  selectedDraftId: string | null;
  selectedGeneratedId: string | null;
  showArchived: boolean;
  sortState: HistorySortState;
  onArchiveGeneration: (item: GenerationHistoryItem) => void;
  onRestoreGeneration: (item: GenerationHistoryItem) => void;
  onDeleteDraft: (item: GenerationHistoryItem) => void;
  onSelectItem: (item: GenerationHistoryItem) => void;
  onSortHeaderClick: (key: HistorySortKey) => void;
};
