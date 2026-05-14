import { HISTORY_PAGE_SIZE } from "./generatorConstants";
import type { FeedbackRating } from "@/components/feedback/FeedbackButtons";
import type { GenerationHistoryItem } from "./HistoryPanel";
import type {
  AccountUsageResponse,
  GenerateResponse,
  GenerationFeedback,
  GenerationHistoryResponse,
} from "./generatorTypes";

// === API ===

export async function fetchAccountUsage(): Promise<{
  usageLabel: string | null;
  monthlyResetAt: string | null;
  resolved: boolean;
}> {
  try {
    const response = await fetch("/api/account/usage", { method: "GET" });
    if (!response.ok) {
      return { usageLabel: null, monthlyResetAt: null, resolved: false };
    }
    const data = (await response.json()) as AccountUsageResponse;
    const nextLabel =
      typeof data.usageLabel === "string" ? data.usageLabel.trim() : "";
    return {
      usageLabel: nextLabel || null,
      monthlyResetAt:
        typeof data.monthlyResetAt === "string" && data.monthlyResetAt.trim()
          ? data.monthlyResetAt
          : null,
      resolved: true,
    };
  } catch {
    return { usageLabel: null, monthlyResetAt: null, resolved: false };
  }
}

export async function fetchGenerationHistory(): Promise<
  { status: "ok"; items: GenerationHistoryItem[] } | { status: "unauthenticated" }
> {
  const fetchedPages: GenerationHistoryItem[][] = [];
  let page = 0;
  let hasNext = true;

  while (hasNext) {
    const response = await fetch(
      `/api/generations/history?limit=${HISTORY_PAGE_SIZE}&page=${page}&includeArchived=true`,
      { method: "GET" },
    );

    if (response.status === 401) {
      return { status: "unauthenticated" };
    }
    if (!response.ok) {
      throw new Error("Could not load history.");
    }

    const data = (await response.json()) as GenerationHistoryResponse;
    fetchedPages.push(Array.isArray(data.items) ? data.items : []);
    hasNext = Boolean(data.hasNext);
    page += 1;
  }

  const seen = new Set<string>();
  const items: GenerationHistoryItem[] = [];
  for (const item of fetchedPages.flat()) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }

  return { status: "ok", items };
}

export async function requestGeneration(input: {
  title: string;
  description: string;
  turnstileToken: string | null;
  generationContextId?: string | null;
}): Promise<GenerateResponse & { error?: string }> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(input.turnstileToken
        ? { "x-turnstile-token": input.turnstileToken }
        : {}),
    },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      generationContextId: input.generationContextId ?? null,
      turnstileToken: input.turnstileToken,
    }),
  });

  const data = (await response.json()) as GenerateResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "Could not generate tags.");
  }

  return data;
}

export async function archiveGeneration(generationId: string): Promise<string> {
  const response = await fetch("/api/generations/history", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ generationId, action: "archive" }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    archivedAt?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || "Could not archive generation.");
  }

  return data.archivedAt ?? new Date().toISOString();
}

export async function restoreGeneration(generationId: string): Promise<void> {
  const response = await fetch("/api/generations/history", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ generationId, action: "restore" }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    archivedAt?: string | null;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || "Could not restore generation.");
  }
}

export async function saveGenerationFeedback(input: {
  action: "set" | "clear";
  generationId: string;
  rating?: FeedbackRating;
  note?: string;
}): Promise<GenerationFeedback | null> {
  const response = await fetch("/api/feedback/generation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: input.action,
      generationId: input.generationId,
      ...(input.rating ? { rating: input.rating } : {}),
      ...(typeof input.note === "string" ? { note: input.note } : {}),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    feedback?: GenerationFeedback | null;
  };
  if (!response.ok) {
    throw new Error(data.error || "Could not save generation feedback.");
  }
  return data.feedback ?? null;
}
