// === Helpers ===

export function sanitizeTags(tags: string[]) {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const rawTag of tags) {
    const tag = typeof rawTag === "string" ? rawTag.trim() : "";
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    cleaned.push(tag);
  }

  return cleaned;
}

export function sanitizeMergedTags(target: string[], discovery: string[]) {
  return sanitizeTags([...target, ...discovery]);
}

export function getUsageHintText(
  usageLabel: string | null,
  monthlyResetAt?: string | null,
) {
  if (!usageLabel) return null;
  const normalized = usageLabel.toLowerCase();

  if (normalized.includes("/100")) {
    if (monthlyResetAt) {
      return "Monthly includes 100 generations each billing period.";
    }
    return "Monthly includes 100 generations each billing period.";
  }
  if (normalized.includes("starter")) {
    return "Starter generations are prepaid and decrease as you generate.";
  }
  if (normalized.includes("free")) {
    return "New accounts get 1 free generation. You can purchase more generations in the pricing section.";
  }

  return null;
}
