type ScoredTag = {
  tag: string;
  score?: number;
};

type SelectionInput = {
  target: ScoredTag[];
  discovery: ScoredTag[];
};

type SelectionOutput = {
  tags: string[];
  target: string[];
  discovery: string[];
};

const LOW_INTENT = new Set([
  "idea",
  "wear",
  "style",
  "new",
  "established",
  "apparel",
  "clothing",
  "meaningful",
  "unique",
  "comfortable",
]);
const STOPWORDS = new Set(["for", "the", "and", "with", "from", "your", "you"]);
const APPAREL_TYPES = ["shirt", "tee", "t shirt", "v neck", "hoodie", "polo", "pullover", "sweatshirt"];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/[^a-z0-9%\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampTag(tag: string): string {
  if (tag.length <= 20) return tag;

  const words = tag.split(" ");
  const out: string[] = [];
  for (const word of words) {
    const next = [...out, word].join(" ");
    if (next.length > 20) break;
    out.push(word);
  }

  return out.join(" ").trim();
}

export function normalizeTag(tag: string): string {
  return clampTag(normalize(tag));
}

function tokenize(tag: string): string[] {
  return normalize(tag)
    .split(" ")
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

function isNearDuplicate(a: string, b: string): boolean {
  if (a === b) return true;
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (!aTokens.length || !bTokens.length) return false;

  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  const intersection = [...aSet].filter((word) => bSet.has(word)).length;
  const union = new Set([...aSet, ...bSet]).size;
  const jaccard = union ? intersection / union : 0;

  if (jaccard >= 0.8) return true;
  if (aTokens.join(" ") === bTokens.join(" ")) return true;
  return false;
}

function countWords(text: string): number {
  return tokenize(text).length;
}

function hasLowIntentWord(tag: string): boolean {
  return tokenize(tag).some((word) => LOW_INTENT.has(word));
}

function detectPrimaryApparelType(title: string, description: string): string[] {
  const joined = normalize(`${title} ${description}`);
  return APPAREL_TYPES.filter((type) => joined.includes(type));
}

function hasTypeMismatch(tag: string, title: string, description: string): boolean {
  const primaryTypes = detectPrimaryApparelType(title, description);
  const tagNorm = normalize(tag);
  if (!primaryTypes.length) return false;

  const isShirtFamily = primaryTypes.some((t) => ["shirt", "tee", "t shirt", "v neck"].includes(t));
  if (!isShirtFamily) return false;

  if (tagNorm.includes("polo") || tagNorm.includes("pullover") || tagNorm.includes("hoodie")) {
    return true;
  }
  return false;
}

function scoreTag(tag: string, title: string, description: string): number {
  const normalizedTag = normalizeTag(tag);
  if (!normalizedTag) return 0;
  if (normalizedTag.length > 20) return 0;
  if (hasLowIntentWord(normalizedTag)) return 0;
  if (hasTypeMismatch(normalizedTag, title, description)) return 0;

  let score = 30;
  const words = countWords(normalizedTag);
  const len = normalizedTag.length;
  const context = new Set(tokenize(`${title} ${description}`));
  const overlap = tokenize(normalizedTag).filter((word) => context.has(word)).length;

  if (words >= 2) score += 15;
  if (words >= 3) score += 10;
  if (len >= 15 && len <= 20) score += 20;
  if (overlap >= 1) score += 10;
  if (overlap >= 2) score += 10;
  if (len < 8) score -= 15;

  return Math.max(0, Math.min(100, score));
}

function cleanAndScore(input: ScoredTag[], title: string, description: string): ScoredTag[] {
  const out: ScoredTag[] = [];
  const seen: string[] = [];

  for (const candidate of input) {
    const tag = normalizeTag(candidate.tag);
    if (!tag || tag.length < 3) continue;
    if (hasLowIntentWord(tag)) continue;
    if (hasTypeMismatch(tag, title, description)) continue;
    if (seen.some((existing) => isNearDuplicate(existing, tag))) continue;

    seen.push(tag);
    out.push({ tag, score: candidate.score ?? scoreTag(tag, title, description) });
  }

  return out;
}

export function rankCandidateTags(rawTags: string[], title: string, description: string, limit: number): string[] {
  const cleaned = cleanAndScore(
    (rawTags || []).map((tag) => ({ tag })),
    title,
    description,
  )
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((item) => item.tag);

  return cleaned.slice(0, limit);
}

function keywordPairs(words: string[]): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < words.length; i += 1) {
    pairs.push(words[i]);
    if (words[i + 1]) pairs.push(`${words[i]} ${words[i + 1]}`);
    if (words[i + 2]) pairs.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return pairs;
}

function cleanTags(candidates: string[]): string[] {
  const cleaned = cleanAndScore(
    candidates.map((tag) => ({ tag })),
    "",
    "",
  );
  return cleaned.map((item) => item.tag);
}

function keywords(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

export function fallbackTags(title: string, description: string): string[] {
  const words = [...new Set([...keywords(title), ...keywords(description)])];
  const candidates: string[] = [];

  candidates.push(...keywordPairs(words));

  if (words.includes("dad")) {
    candidates.push("fathers day gift", "dad birthday shirt", "gift for father", "custom dad shirt");
  }

  candidates.push("personalized gift", "custom name gift", "everyday wear shirt", "minimal look tee");

  const cleaned = cleanAndScore(
    candidates.map((tag) => ({ tag })),
    title,
    description,
  ).map((item) => item.tag);

  while (cleaned.length < 13) {
    cleaned.push(`tag ${cleaned.length + 1}`);
  }

  return cleaned.slice(0, 13);
}

export function sanitizeModelTags(rawTags: string[], title: string, description: string): string[] {
  const cleaned = cleanAndScore(
    (rawTags || []).map((tag) => ({ tag })),
    title,
    description,
  ).map((item) => item.tag);

  if (cleaned.length >= 13) return cleaned.slice(0, 13);

  const fallback = fallbackTags(title, description);
  const combined = cleanAndScore(
    [...cleaned, ...fallback].map((tag) => ({ tag })),
    title,
    description,
  ).map((item) => item.tag);

  return combined.slice(0, 13);
}

export function pickFinalTags(input: SelectionInput, title: string, description: string): SelectionOutput {
  const cleanedTarget = cleanAndScore(input.target, title, description).sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0),
  );
  const cleanedDiscovery = cleanAndScore(input.discovery, title, description).sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0),
  );

  const selectedTarget: string[] = [];
  const selectedDiscovery: string[] = [];

  for (const item of cleanedTarget) {
    if (selectedTarget.length === 5) break;
    if (selectedTarget.some((existing) => isNearDuplicate(existing, item.tag))) continue;
    selectedTarget.push(item.tag);
  }

  for (const item of cleanedDiscovery) {
    if (selectedDiscovery.length === 8) break;
    if (selectedTarget.some((existing) => isNearDuplicate(existing, item.tag))) continue;
    if (selectedDiscovery.some((existing) => isNearDuplicate(existing, item.tag))) continue;
    selectedDiscovery.push(item.tag);
  }

  if (selectedTarget.length < 5 || selectedDiscovery.length < 8) {
    const fallback = fallbackTags(title, description);
    for (const tag of fallback) {
      if (selectedTarget.length < 5) {
        if (!selectedTarget.some((existing) => isNearDuplicate(existing, tag))) {
          selectedTarget.push(tag);
          continue;
        }
      }

      if (selectedDiscovery.length < 8) {
        if (!selectedTarget.some((existing) => isNearDuplicate(existing, tag)) &&
          !selectedDiscovery.some((existing) => isNearDuplicate(existing, tag))) {
          selectedDiscovery.push(tag);
        }
      }
    }
  }

  const tags = [...selectedTarget.slice(0, 5), ...selectedDiscovery.slice(0, 8)];
  return { tags: tags.slice(0, 13), target: selectedTarget.slice(0, 5), discovery: selectedDiscovery.slice(0, 8) };
}
