"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toastMessages } from "@/components/toasts/toastMessages";
import type { ToastInput } from "@/components/toasts/toasts";
import { archiveGeneration, fetchGenerationHistory, restoreGeneration } from "./generatorApi";
import {
  clearHistoryCache,
  readHistoryCache,
  writeHistoryCache,
} from "./generatorStorage";
import type {
  DraftHistoryState,
  GenerationFeedback,
  HistoryConfirmAction,
} from "./generatorTypes";
import type {
  GenerationHistoryItem,
  HistoryMode,
  HistorySortKey,
  HistorySortState,
} from "./HistoryPanel";

// === Hooks ===

export function useGeneratorHistory({
  isDemoActive,
  showToast,
  onHistoryUnavailable,
  onCachedDraftSelected,
  onSelectedDraftDeleted,
}: UseGeneratorHistoryParams) {
  const [historyItems, setHistoryItems] = useState<GenerationHistoryItem[]>([]);
  const [historyMode, setHistoryMode] = useState<HistoryMode>("generator");
  const [historySortState, setHistorySortState] = useState<HistorySortState>(
    null,
  );
  const [showArchivedHistory, setShowArchivedHistory] = useState(false);
  const [isHistoryAuthenticated, setIsHistoryAuthenticated] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null,
  );
  const [draftHistoryItems, setDraftHistoryItems] = useState<DraftHistoryState[]>(
    [],
  );
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [historyConfirmAction, setHistoryConfirmAction] =
    useState<HistoryConfirmAction | null>(null);

  const displayHistoryItems = useMemo<GenerationHistoryItem[]>(() => {
    const items = [...historyItems];
    for (const draft of draftHistoryItems) {
      items.push({
        id: draft.id,
        createdAt: draft.updatedAt,
        title: draft.title,
        description: draft.description,
        targetTags: [],
        discoveryTags: [],
        isDraft: true,
      });
    }
    return items;
  }, [draftHistoryItems, historyItems]);

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const data = await fetchGenerationHistory();
      if (data.status === "unauthenticated") {
        setIsHistoryAuthenticated(false);
        setHistoryItems([]);
        setDraftHistoryItems([]);
        setSelectedDraftId(null);
        setSelectedHistoryId(null);
        clearHistoryCache();
        onHistoryUnavailable();
        return;
      }

      setIsHistoryAuthenticated(true);
      setHistoryItems(data.items);

      setSelectedHistoryId((current) => {
        if (!current) return null;
        if (current === "draft") return current;
        const matched = data.items.find((item) => item.id === current) ?? null;
        return matched ? matched.id : null;
      });
    } catch {
      setIsHistoryAuthenticated(false);
      clearHistoryCache();
      onHistoryUnavailable();
      showToast(toastMessages.historyLoadFailed);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [onHistoryUnavailable, showToast]);

  useEffect(() => {
    const cached = readHistoryCache();
    if (!cached) return;

    const cachedItems = Array.isArray(cached.generatedItems)
      ? cached.generatedItems
      : [];
    const cachedDrafts = Array.isArray(cached.drafts) ? cached.drafts : [];

    setIsHistoryAuthenticated(true);
    setHistoryItems(cachedItems);
    setDraftHistoryItems(cachedDrafts);
    setHistoryMode("generator");
    setHistorySortState(cached.sortState);
    setShowArchivedHistory(cached.showArchived);
    setSelectedDraftId(
      cached.selectedDraftId &&
        cachedDrafts.some((draft) => draft.id === cached.selectedDraftId)
        ? cached.selectedDraftId
        : null,
    );

    if (cached.selectedGeneratedId || cached.selectedDraftId) {
      const nextSelectedId = cached.selectedDraftId
        ? "draft"
        : cached.selectedGeneratedId;
      setSelectedHistoryId(nextSelectedId);

      if (cached.selectedDraftId && cachedDrafts.length > 0) {
        const selectedDraft =
          cachedDrafts.find((draft) => draft.id === cached.selectedDraftId) ??
          cachedDrafts[cachedDrafts.length - 1];
        if (selectedDraft) {
          onCachedDraftSelected(selectedDraft);
        }
      }
      return;
    }

    setSelectedHistoryId(null);
  }, [onCachedDraftSelected]);

  useEffect(() => {
    void loadHistory();
    // Intentionally run once on mount to mirror previous behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDemoActive) return;
    setSelectedHistoryId(null);
  }, [isDemoActive]);

  useEffect(() => {
    if (!isHistoryAuthenticated) {
      clearHistoryCache();
      return;
    }

    writeHistoryCache({
      generatedItems: historyItems,
      selectedGeneratedId:
        selectedHistoryId && selectedHistoryId !== "draft"
          ? selectedHistoryId
          : null,
      drafts: draftHistoryItems,
      selectedDraftId,
      mode: "generator",
      sortState: historySortState,
      showArchived: showArchivedHistory,
      savedAt: Date.now(),
    });
  }, [
    draftHistoryItems,
    historyItems,
    historySortState,
    isHistoryAuthenticated,
    selectedHistoryId,
    selectedDraftId,
    showArchivedHistory,
  ]);

  const syncDraftFromUserInput = useCallback(
    (nextTitle: string, nextDescription: string) => {
      if (!isHistoryAuthenticated) return;

      const trimmedTitle = nextTitle.trim();
      const trimmedDescription = nextDescription.trim();
      if (!trimmedTitle && !trimmedDescription) {
        if (selectedDraftId) {
          setDraftHistoryItems((current) =>
            current.filter((draft) => draft.id !== selectedDraftId),
          );
        } else {
          setDraftHistoryItems([]);
        }
        setSelectedDraftId(null);
        if (selectedHistoryId === "draft") {
          setSelectedHistoryId(null);
        }
        return;
      }

      const nextDraft = {
        id:
          selectedHistoryId === "draft" && selectedDraftId
            ? selectedDraftId
            : `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: nextTitle,
        description: nextDescription,
        updatedAt: new Date().toISOString(),
      };

      if (selectedHistoryId === "draft" && selectedDraftId) {
        setDraftHistoryItems((current) =>
          current.map((draft) =>
            draft.id === selectedDraftId ? nextDraft : draft,
          ),
        );
      } else {
        setDraftHistoryItems((current) => [...current, nextDraft]);
        setSelectedHistoryId("draft");
        setSelectedDraftId(nextDraft.id);
      }
    },
    [isHistoryAuthenticated, selectedDraftId, selectedHistoryId],
  );

  const deleteDraftItem = useCallback(
    (draftId: string) => {
      if (!draftId) return;

      setDraftHistoryItems((current) =>
        current.filter((draft) => draft.id !== draftId),
      );
      setSelectedDraftId((current) => (current === draftId ? null : current));

      if (selectedHistoryId === "draft" && selectedDraftId === draftId) {
        setSelectedHistoryId(null);
        onSelectedDraftDeleted();
      }
    },
    [onSelectedDraftDeleted, selectedDraftId, selectedHistoryId],
  );

  const archiveGenerationItem = useCallback(async (item: GenerationHistoryItem) => {
    const archivedAt = await archiveGeneration(item.id);
    setHistoryItems((current) =>
      current.map((historyItem) =>
        historyItem.id === item.id ? { ...historyItem, archivedAt } : historyItem,
      ),
    );
  }, []);

  const restoreGenerationItem = useCallback(async (item: GenerationHistoryItem) => {
    await restoreGeneration(item.id);
    setHistoryItems((current) =>
      current.map((historyItem) =>
        historyItem.id === item.id
          ? { ...historyItem, archivedAt: null }
          : historyItem,
      ),
    );
  }, []);

  const confirmHistoryAction = useCallback(async () => {
    if (!historyConfirmAction) return;

    if (historyConfirmAction.type === "delete-draft") {
      deleteDraftItem(historyConfirmAction.item.id);
      setHistoryConfirmAction(null);
      return;
    }

    try {
      if (historyConfirmAction.type === "restore-generation") {
        await restoreGenerationItem(historyConfirmAction.item);
      } else {
        await archiveGenerationItem(historyConfirmAction.item);
      }
      setHistoryConfirmAction(null);
    } catch (err) {
      if (historyConfirmAction.type === "restore-generation") {
        showToast(toastMessages.historyRestoreFailed);
      } else {
        showToast({
          title: "Archive failed",
          body:
            err instanceof Error
              ? err.message
              : "Could not archive generation. Please try again.",
          type: "danger",
        });
      }
    }
  }, [
    archiveGenerationItem,
    deleteDraftItem,
    historyConfirmAction,
    restoreGenerationItem,
    showToast,
  ]);

  const cycleHistorySort = useCallback(
    (key: HistorySortKey) => {
      if (key === "status") {
        if (showArchivedHistory) {
          setShowArchivedHistory(false);
          setHistorySortState(null);
          return;
        }
        if (!historySortState || historySortState.key !== "status") {
          setHistorySortState({ key, direction: "asc" });
          return;
        }
        if (historySortState.direction === "asc") {
          setHistorySortState({ key, direction: "desc" });
          return;
        }
        setHistorySortState(null);
        setShowArchivedHistory(true);
        return;
      }

      setShowArchivedHistory(false);
      setHistorySortState((current) => {
        if (key === "date") {
          if (!current || current.key !== "date") return { key, direction: "desc" };
          if (current.direction === "desc") return { key, direction: "asc" };
          return null;
        }
        if (!current || current.key !== key) return { key, direction: "asc" };
        if (current.direction === "asc") return { key, direction: "desc" };
        return null;
      });
    },
    [historySortState, showArchivedHistory],
  );

  const setFeedbackForGenerationInHistory = useCallback(
    (generationId: string, feedback: GenerationFeedback | null) => {
      setHistoryItems((current) =>
        current.map((item) =>
          item.id === generationId ? { ...item, feedback } : item,
        ),
      );
    },
    [],
  );

  const removeSelectedDraftAfterGeneration = useCallback(() => {
    if (selectedHistoryId === "draft" && selectedDraftId) {
      setDraftHistoryItems((current) =>
        current.filter((draft) => draft.id !== selectedDraftId),
      );
      setSelectedDraftId(null);
    }
  }, [selectedDraftId, selectedHistoryId]);

  return {
    displayHistoryItems,
    historyMode,
    setHistoryMode,
    historySortState,
    showArchivedHistory,
    isHistoryAuthenticated,
    isHistoryLoading,
    selectedHistoryId,
    setSelectedHistoryId,
    selectedDraftId,
    setSelectedDraftId,
    historyConfirmAction,
    setHistoryConfirmAction,
    loadHistory,
    syncDraftFromUserInput,
    removeSelectedDraftAfterGeneration,
    confirmHistoryAction,
    cycleHistorySort,
    setFeedbackForGenerationInHistory,
  };
}

// === Types ===

type UseGeneratorHistoryParams = {
  isDemoActive: boolean;
  showToast: (toast: ToastInput) => string;
  onHistoryUnavailable: () => void;
  onCachedDraftSelected: (draft: DraftHistoryState) => void;
  onSelectedDraftDeleted: () => void;
};
