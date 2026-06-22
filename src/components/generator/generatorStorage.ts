import {
  CONTEXT_STORAGE_PREFIX,
  HISTORY_CACHE_KEY,
} from "./generatorConstants";
import type {
  DraftHistoryState,
  HistoryCache,
  LegacyHistoryCache,
  PendingContext,
} from "./generatorTypes";

const PENDING_GUEST_GENERATION_KEY = "tagloom:guest-generation:v1";
const PENDING_GUEST_GENERATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// === Helpers ===

export function getContextStorageKey(id: string) {
  return `${CONTEXT_STORAGE_PREFIX}${id}`;
}

export function generateContextId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function savePendingContext(context: PendingContext) {
  sessionStorage.setItem(
    getContextStorageKey(context.id),
    JSON.stringify(context),
  );
}

export function loadPendingContext(id: string): PendingContext | null {
  const raw = sessionStorage.getItem(getContextStorageKey(id));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingContext;
    if (!parsed?.id || !parsed?.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingContext(id: string) {
  sessionStorage.removeItem(getContextStorageKey(id));
}

export type PendingGuestGeneration = {
  kind: "guest_generation";
  id: string;
  title: string;
  description: string;
  createdAt: number;
};

export function savePendingGuestGeneration(record: PendingGuestGeneration) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PENDING_GUEST_GENERATION_KEY,
    JSON.stringify(record),
  );
}

export function loadPendingGuestGeneration(): PendingGuestGeneration | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(PENDING_GUEST_GENERATION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingGuestGeneration> | null;
    if (
      !parsed ||
      parsed.kind !== "guest_generation" ||
      typeof parsed.id !== "string" ||
      !parsed.id ||
      typeof parsed.title !== "string" ||
      typeof parsed.description !== "string" ||
      typeof parsed.createdAt !== "number" ||
      !Number.isFinite(parsed.createdAt)
    ) {
      return null;
    }

    if (Date.now() - parsed.createdAt > PENDING_GUEST_GENERATION_MAX_AGE_MS) {
      clearPendingGuestGeneration();
      return null;
    }

    return {
      kind: "guest_generation",
      id: parsed.id,
      title: parsed.title,
      description: parsed.description,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

export function clearPendingGuestGeneration() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_GUEST_GENERATION_KEY);
}

export function readHistoryCache(): HistoryCache | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(HISTORY_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as LegacyHistoryCache;
    if (!parsed) return null;
    const legacyDraft = parsed.draft;
    const generatedItems = Array.isArray(parsed.generatedItems)
      ? parsed.generatedItems
      : Array.isArray(parsed.activeGeneratedItems)
        ? parsed.activeGeneratedItems
        : Array.isArray(parsed.page0)
          ? parsed.page0
          : [];
    return {
      generatedItems,
      selectedGeneratedId:
        typeof parsed.selectedGeneratedId === "string"
          ? parsed.selectedGeneratedId
          : typeof parsed.selectedId === "string" &&
              parsed.selectedId !== "draft"
            ? parsed.selectedId
            : null,
      drafts: Array.isArray(parsed.drafts)
        ? parsed.drafts
            .filter(
              (draft): draft is DraftHistoryState =>
                Boolean(draft) &&
                typeof draft.id === "string" &&
                typeof draft.title === "string" &&
                typeof draft.description === "string",
            )
            .map((draft) => ({
              id: draft.id,
              title: draft.title,
              description: draft.description,
              updatedAt:
                typeof draft.updatedAt === "string"
                  ? draft.updatedAt
                  : new Date().toISOString(),
            }))
        : legacyDraft &&
            typeof legacyDraft.title === "string" &&
            typeof legacyDraft.description === "string"
          ? [
              {
                id: "draft",
                title: legacyDraft.title,
                description: legacyDraft.description,
                updatedAt:
                  typeof legacyDraft.updatedAt === "string"
                    ? legacyDraft.updatedAt
                    : new Date().toISOString(),
              },
            ]
          : [],
      selectedDraftId:
        typeof parsed.selectedDraftId === "string"
          ? parsed.selectedDraftId
          : null,
      mode: "generator",
      sortState:
        parsed.sortState &&
        typeof parsed.sortState === "object" &&
        ["date", "title", "description", "status"].includes(
          parsed.sortState.key,
        ) &&
        (parsed.sortState.direction === "asc" ||
          parsed.sortState.direction === "desc")
          ? parsed.sortState
          : null,
      showArchived: Boolean(parsed.showArchived),
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeHistoryCache(cache: HistoryCache) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // noop
  }
}

export function clearHistoryCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(HISTORY_CACHE_KEY);
  } catch {
    // noop
  }
}
