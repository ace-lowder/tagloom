import OpenAI from "openai";

export const GENERATION_LOGIC_VERSION = "1.5";
export const MAX_GENERATION_DESCRIPTION_LENGTH = 1200;
const MAX_COMPACT_DESCRIPTION_LENGTH = 500;

const ignoreTokens = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "when",
  "with",
]);

const directBoilerplateTokens = new Set([
  "www",
  "http",
  "https",
  "etsy",
  "com",
  "listing",
  "account",
  "settings",
  "links",
  "seller",
  "guarantee",
  "refund",
  "shipping",
  "policies",
  "policy",
  "materials",
  "details",
  "minimum",
  "dpi",
  "tiff",
]);

const fileSpecTokens = new Set([
  "svg",
  "eps",
  "ai",
  "pdf",
  "png",
  "jpg",
  "jpeg",
]);

const measurementSpecTokens = new Set([
  "thickness",
  "cm",
  "mm",
  "inch",
  "inches",
  "size",
  "sizes",
  "dimension",
  "dimensions",
]);

const boilerplateContextTokens = new Set([
  "minimum",
  "dpi",
  "file",
  "files",
  "format",
  "formats",
  "seller",
  "types",
  "download",
  "downloadable",
  "thickness",
  "cm",
  "mm",
  "inch",
  "inches",
  "size",
  "sizes",
  "dimension",
  "dimensions",
]);

const descriptionFillerTokens = new Set([
  "about",
  "above",
  "after",
  "again",
  "all",
  "also",
  "any",
  "because",
  "before",
  "below",
  "but",
  "can",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "done",
  "dont",
  "each",
  "even",
  "few",
  "get",
  "gets",
  "got",
  "had",
  "has",
  "have",
  "having",
  "here",
  "if",
  "into",
  "just",
  "let",
  "ll",
  "may",
  "might",
  "more",
  "most",
  "need",
  "not",
  "now",
  "only",
  "our",
  "ours",
  "please",
  "re",
  "same",
  "should",
  "so",
  "some",
  "than",
  "then",
  "there",
  "these",
  "they",
  "those",
  "through",
  "us",
  "ve",
  "very",
  "was",
  "we",
  "were",
  "what",
  "which",
  "who",
  "why",
  "will",
  "would",
  "you",
  "your",
  "yours",
  "appear",
  "contact",
  "help",
  "s",
  "no",
  "due",
  "slightly",
  "fully",
  "containing",
]);

const compactDescriptionProcessTokens = new Set([
  "check",
  "spam",
  "junk",
  "folder",
  "inbox",
  "shipped",
  "shipping",
  "delivery",
  "download",
  "downloadable",
  "link",
  "links",
  "file",
  "files",
  "pdf",
  "message",
  "reach",
  "gladly",
  "works",
  "customize",
  "once",
  "within",
  "quantity",
  "width",
  "step",
  "steps",
  "vary",
  "varies",
  "color",
  "colour",
  "colours",
  "everyone",
  "email",
  "emails",
  "containing",
  "monitor",
  "monitors",
  "minute",
  "minutes",
  "party",
  "parties",
  "fully",
  "slightly",
  "due",
  "choose",
  "circle",
  "square",
  "touch",
  "turns",
  "kind",
  "easy",
  "way",
  "brand",
  "compatible",
  "compatibility",
  "recommend",
  "recommended",
  "requires",
  "require",
  "usage",
  "device",
  "devices",
  "app",
  "apps",
  "software",
]);

const lowQualityTagLeadingTokens = new Set([
  "if",
  "so",
  "you",
  "can",
  "does",
  "not",
  "may",
  "contact",
  "help",
  "link",
  "file",
  "inbox",
  "spam",
  "shipping",
  "shipped",
  "email",
  "fully",
  "slightly",
  "choose",
  "touch",
  "fast",
]);

const lowQualityTagProcessTokens = new Set([
  "check",
  "spam",
  "junk",
  "folder",
  "inbox",
  "shipped",
  "shipping",
  "delivery",
  "download",
  "link",
  "links",
  "file",
  "files",
  "pdf",
  "message",
  "reach",
  "out",
  "gladly",
  "works",
  "customize",
  "once",
  "within",
  "quantity",
  "width",
  "steps",
  "everyone",
  "vary",
  "varies",
  "email",
  "emails",
  "containing",
  "monitor",
  "monitors",
  "minute",
  "minutes",
  "party",
  "parties",
  "fully",
  "slightly",
  "due",
  "choose",
  "circle",
  "square",
  "touch",
  "turns",
  "kind",
  "easy",
  "way",
  "brand",
]);

const lowQualityTagSafePhrases = new Set([
  "nickel free",
  "svg bundle",
  "digital download",
  "5x7 print",
  "8oz candle",
  "3d nail art",
  "custom gift",
  "birthday party",
  "party decor",
  "party invite",
  "circle sticker",
  "square sticker",
  "brand sticker",
]);

const generationSeparatorsPattern = /(?:•|\||★|☆|✓|✔|→|=>)/g;
const urlPattern = /\b(?:https?:\/\/|www\.)\S+/gi;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const repeatedSymbolPattern = /([^\p{L}\p{N}\s])\1+/gu;
const punctuationRunPattern = /[!-/:-@[-`{-~]{2,}/g;

const emojiAndPictographicPattern = (() => {
  try {
    return /[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F]/gu;
  } catch {
    return null;
  }
})();

type Keywords = {
  used: string[];
  title: string[];
  description: string[];
};

type FillerCandidate = {
  phrase: string;
  tokens: string[];
  source: "title" | "description";
  wordCount: number;
  sourceIndex: number;
};

export type GenerationSource = "model" | "fallback";

export type GeneratedTags = {
  tags: {
    target: string[];
    discovery: string[];
  };
  source: GenerationSource;
};

function trimToDescriptionLimit(text: string): string {
  if (text.length <= MAX_GENERATION_DESCRIPTION_LENGTH) return text;

  const truncated = text.slice(0, MAX_GENERATION_DESCRIPTION_LENGTH);
  const lastWhitespace = truncated.lastIndexOf(" ");
  if (lastWhitespace > 0) {
    return truncated.slice(0, lastWhitespace).trim();
  }
  return truncated.trim();
}

function trimToCompactDescriptionLimit(text: string): string {
  if (text.length <= MAX_COMPACT_DESCRIPTION_LENGTH) return text;

  const truncated = text.slice(0, MAX_COMPACT_DESCRIPTION_LENGTH);
  const lastWhitespace = truncated.lastIndexOf(" ");
  if (lastWhitespace > 0) {
    return truncated.slice(0, lastWhitespace).trim();
  }
  return truncated.trim();
}

function normalizeDescriptionCheckToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

function normalizePossessiveText(text: string): string {
  const withoutPossessives = text
    .replace(/\b([a-z0-9]+)(?:'s|’s)\b/gi, "$1")
    .replace(/\b([a-z0-9]+)(?:s'|s’)\b/gi, "$1s");

  return withoutPossessives.replace(/\b(?:s|re|ll|ve)\b/gi, " ");
}

function isDescriptionFillerToken(token: string): boolean {
  return descriptionFillerTokens.has(token);
}

function isCompactableMeasurementToken(token: string): boolean {
  if (token === "3d" || token === "8oz" || token === "5x7") return false;
  if (token === "cm" || token === "mm" || token === "inch" || token === "inches") return true;
  if (token === "pcs") return true;
  return /^(\d+(?:\.\d+)?)(cm|mm|pcs)$/.test(token);
}

function stripDescriptionFillerWords(description: string): string {
  const kept: string[] = [];

  for (const originalToken of description.split(/\s+/)) {
    if (!originalToken) continue;
    const normalizedToken = normalizeDescriptionCheckToken(originalToken);
    if (!normalizedToken) continue;
    if (isDescriptionFillerToken(normalizedToken)) continue;
    if (isCompactableMeasurementToken(normalizedToken)) continue;
    kept.push(originalToken);
  }

  return kept.join(" ");
}

export function cleanGenerationDescription(description: string): string {
  const normalized = String(description ?? "").normalize("NFKC");
  const normalizedPossessives = normalizePossessiveText(normalized);
  const noUrls = normalizedPossessives.replace(urlPattern, " ");
  const noEmails = noUrls.replace(emailPattern, " ");
  const noEmoji = emojiAndPictographicPattern
    ? noEmails.replace(emojiAndPictographicPattern, " ")
    : noEmails;
  const standardizedSeparators = noEmoji.replace(generationSeparatorsPattern, " ");
  const noRepeatedSymbols = standardizedSeparators
    .replace(repeatedSymbolPattern, " ")
    .replace(punctuationRunPattern, " ");
  const collapsedWhitespace = noRepeatedSymbols.replace(/\s+/g, " ").trim();
  const noFillerWords = stripDescriptionFillerWords(collapsedWhitespace);
  const recollapsedWhitespace = noFillerWords.replace(/\s+/g, " ").trim();

  return trimToDescriptionLimit(recollapsedWhitespace);
}

function isCompatibilityContextToken(tokens: string[], index: number): boolean {
  const token = tokens[index];
  if (!token) return false;

  const deviceTerms = new Set([
    "ipad",
    "pro",
    "air",
    "apple",
    "pencil",
    "tablet",
    "tablets",
    "ios",
    "android",
    "goodnotes",
    "notability",
  ]);
  if (!deviceTerms.has(token)) return false;

  const contextTerms = new Set([
    "compatible",
    "compatibility",
    "works",
    "work",
    "recommend",
    "recommended",
    "requires",
    "require",
    "usage",
    "use",
    "with",
    "using",
    "device",
    "devices",
    "app",
    "apps",
    "software",
  ]);

  for (let offset = -6; offset <= 6; offset += 1) {
    if (offset === 0) continue;
    const neighbor = tokens[index + offset];
    if (neighbor && contextTerms.has(neighbor)) return true;
  }

  return false;
}

export function compactGenerationDescription(description: string): string {
  const cleaned = cleanGenerationDescription(description);
  if (!cleaned) return "";

  const cleanedTokens = cleaned
    .split(/\s+/)
    .map((token) => normalizeDescriptionCheckToken(token))
    .filter(Boolean);

  const seen = new Set<string>();
  const kept: string[] = [];

  for (let index = 0; index < cleanedTokens.length; index += 1) {
    const normalizedToken = cleanedTokens[index];
    if (!normalizedToken) continue;
    if (isDescriptionFillerToken(normalizedToken)) continue;
    if (isDescriptionBoilerplateToken(normalizedToken)) continue;
    if (isCompactableMeasurementToken(normalizedToken)) continue;
    if (/^\d+(?:\.\d+)?$/.test(normalizedToken)) continue;
    if (compactDescriptionProcessTokens.has(normalizedToken)) continue;
    if (isCompatibilityContextToken(cleanedTokens, index)) continue;
    if (seen.has(normalizedToken)) continue;

    seen.add(normalizedToken);
    kept.push(normalizedToken);
  }

  const compact = kept.join(" ").trim();
  return trimToCompactDescriptionLimit(compact);
}

function normalizeResponse(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of input) {
    const normalized = String(value ?? "")
      .toLowerCase()
      .replace(/-/g, " ")
      .replace(/'/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) continue;
    if (normalized.length > 20) continue;
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !ignoreTokens.has(token));
}

function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

function hasBoilerplateNeighbor(tokens: string[], index: number): boolean {
  const neighbors: string[] = [];
  for (let offset = -2; offset <= 2; offset += 1) {
    if (offset === 0) continue;
    const token = tokens[index + offset];
    if (token) neighbors.push(token);
  }
  return neighbors.some((token) => boilerplateContextTokens.has(token));
}

function isDescriptionBoilerplateToken(token: string): boolean {
  return directBoilerplateTokens.has(token);
}

function buildDescriptionTokens(description: string): string[] {
  const tokens = tokenize(description);
  const filtered: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (isDescriptionBoilerplateToken(token)) continue;
    if (isDescriptionFillerToken(token)) continue;
    if (isCompactableMeasurementToken(token)) continue;

    if (fileSpecTokens.has(token) && hasBoilerplateNeighbor(tokens, index)) {
      continue;
    }

    if (measurementSpecTokens.has(token) && hasBoilerplateNeighbor(tokens, index)) {
      continue;
    }
    filtered.push(token);
  }

  return uniqueTokens(filtered);
}

function buildKeywords(
  targetTags: string[],
  title: string,
  description: string,
): Keywords {
  const used = uniqueTokens(targetTags.flatMap((tag) => tokenize(tag)));
  const titleTokens = uniqueTokens(tokenize(title));
  const descriptionTokens = buildDescriptionTokens(description);

  return {
    used,
    title: titleTokens,
    description: descriptionTokens,
  };
}

function parseArrayResponse(raw: string): string[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item ?? ""));
  } catch {
    return [];
  }
}

function isLowQualityGeneratedTag(tag: string): boolean {
  const normalizedTag = normalizeResponse([tag])[0] ?? "";
  if (!normalizedTag) return true;
  if (lowQualityTagSafePhrases.has(normalizedTag)) return false;

  const tokens = tokenize(normalizedTag);
  if (tokens.length === 0) return true;
  if (tokens[tokens.length - 1] === "s") return true;
  if (lowQualityTagLeadingTokens.has(tokens[0])) return true;

  const processTokenCount = tokens.filter((token) =>
    lowQualityTagProcessTokens.has(token),
  ).length;
  if (processTokenCount >= 2) return true;

  const hasCompactMeasurement = tokens.some((token) =>
    isCompactableMeasurementToken(token),
  );
  const hasNumericToken = tokens.some((token) => /^\d+(?:\.\d+)?$/.test(token));
  const hasSpecContextToken = tokens.some((token) =>
    ["width", "thickness", "quantity", "point", "widest"].includes(token),
  );
  if (hasCompactMeasurement) return true;
  if (hasSpecContextToken && hasNumericToken) return true;
  if (hasBadProcessPair(tokens)) return true;

  const fillerOrProcessTokenCount = tokens.filter(
    (token) =>
      isDescriptionFillerToken(token) || lowQualityTagProcessTokens.has(token),
  ).length;
  if (tokens.length >= 4 && fillerOrProcessTokenCount * 2 >= tokens.length) {
    return true;
  }

  return false;
}

function hasBadProcessPair(tokens: string[]): boolean {
  const tokenSet = new Set(tokens);
  const has = (...items: string[]) => items.every((item) => tokenSet.has(item));

  if (has("email", "pdf")) return true;
  if (has("monitor", "due")) return true;
  if (has("minutes", "design")) return true;
  if (has("quantity", "color")) return true;
  if (has("quantity", "stone")) return true;
  if (has("apple", "pencil")) return true;

  return false;
}

export function filterLowQualityGeneratedTags(tags: string[]): string[] {
  return tags.filter((tag) => !isLowQualityGeneratedTag(tag));
}

function fillDiscoveryFromKeywords(
  keywords: Keywords,
  excluded: Set<string>,
  needed: number,
): string[] {
  const candidates = buildFillerCandidates(keywords, excluded);
  const phrases = selectFillerCandidates(candidates, keywords, excluded, needed);

  const seen = new Set<string>([...excluded, ...phrases]);
  while (phrases.length < needed) {
    const placeholder = `discovery tag ${phrases.length + 1}`;
    const normalized = normalizeResponse([placeholder])[0];
    if (!normalized || seen.has(normalized)) break;
    seen.add(normalized);
    phrases.push(normalized);
  }

  return phrases.slice(0, needed);
}

function buildFillerCandidates(
  keywords: Keywords,
  excluded: Set<string>,
): FillerCandidate[] {
  const candidates: FillerCandidate[] = [];
  const seen = new Set<string>(excluded);
  const phraseLengths = [4, 3, 2, 1];
  const sources: Array<{ name: "title" | "description"; tokens: string[] }> = [
    { name: "title", tokens: keywords.title },
    { name: "description", tokens: keywords.description },
  ];

  for (const source of sources) {
    for (const phraseLength of phraseLengths) {
      if (source.tokens.length < phraseLength) continue;

      for (
        let start = 0;
        start <= source.tokens.length - phraseLength;
        start += 1
      ) {
        const raw = source.tokens.slice(start, start + phraseLength).join(" ");
        const normalized = normalizeResponse([raw])[0];
        if (!normalized) continue;
        if (normalized.length > 20) continue;
        if (seen.has(normalized)) continue;

        seen.add(normalized);
        candidates.push({
          phrase: normalized,
          tokens: uniqueTokens(tokenize(normalized)),
          source: source.name,
          wordCount: normalized.split(" ").length,
          sourceIndex: start,
        });
      }
    }
  }

  return candidates;
}

function scoreFillerCandidate(
  candidate: FillerCandidate,
  usedTokens: Set<string>,
): number {
  const newTokenCount = candidate.tokens.filter((token) => !usedTokens.has(token)).length;
  const missingTokenPenalty = candidate.tokens.length - newTokenCount;
  const oneWordPenalty = candidate.wordCount === 1 ? 10 : 0;
  const distanceTo20 = 20 - candidate.phrase.length;
  const sourceBonus = candidate.source === "title" ? 0.5 : 0;

  return (
    newTokenCount * 1000 +
    candidate.wordCount * 80 +
    candidate.phrase.length * 8 -
    missingTokenPenalty * 20 -
    oneWordPenalty -
    distanceTo20 +
    sourceBonus
  );
}

function selectFillerCandidates(
  candidates: FillerCandidate[],
  keywords: Keywords,
  excluded: Set<string>,
  needed: number,
): string[] {
  const phrases: string[] = [];
  const seen = new Set<string>(excluded);
  const usedTokens = new Set<string>(keywords.used);
  const remaining = [...candidates];

  while (phrases.length < needed && remaining.length > 0) {
    let bestIndex = -1;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      if (seen.has(candidate.phrase)) continue;

      const score = scoreFillerCandidate(candidate, usedTokens);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
        continue;
      }

      if (score === bestScore && bestIndex >= 0) {
        const best = remaining[bestIndex];
        if (candidate.source !== best.source) {
          if (candidate.source === "title") bestIndex = i;
          continue;
        }
        if (candidate.sourceIndex !== best.sourceIndex) {
          if (candidate.sourceIndex < best.sourceIndex) bestIndex = i;
          continue;
        }
      }
    }

    if (bestIndex < 0) break;

    const [selected] = remaining.splice(bestIndex, 1);
    if (seen.has(selected.phrase)) continue;
    seen.add(selected.phrase);
    phrases.push(selected.phrase);

    for (const token of selected.tokens) {
      usedTokens.add(token);
    }
  }

  return phrases;
}

function prioritizeDiscoveryByUsedKeywords(
  discoveryPhrases: string[],
  usedKeywords: string[],
): string[] {
  const used = new Set(usedKeywords);
  const remaining = discoveryPhrases.map((phrase, index) => ({ phrase, index }));
  const ordered: string[] = [];

  while (remaining.length > 0) {
    let bestIndex = 0;

    for (let i = 1; i < remaining.length; i += 1) {
      const current = remaining[i];
      const best = remaining[bestIndex];

      const currentTokens = uniqueTokens(tokenize(current.phrase));
      const bestTokens = uniqueTokens(tokenize(best.phrase));

      const currentUnused = currentTokens.filter((token) => !used.has(token));
      const bestUnused = bestTokens.filter((token) => !used.has(token));

      if (currentUnused.length !== bestUnused.length) {
        if (currentUnused.length > bestUnused.length) bestIndex = i;
        continue;
      }

      const currentUnusedCharTotal = currentUnused.reduce(
        (sum, token) => sum + token.length,
        0,
      );
      const bestUnusedCharTotal = bestUnused.reduce(
        (sum, token) => sum + token.length,
        0,
      );
      if (currentUnusedCharTotal !== bestUnusedCharTotal) {
        if (currentUnusedCharTotal > bestUnusedCharTotal) bestIndex = i;
        continue;
      }

      const currentDistanceTo20 = Math.abs(20 - current.phrase.length);
      const bestDistanceTo20 = Math.abs(20 - best.phrase.length);
      if (currentDistanceTo20 !== bestDistanceTo20) {
        if (currentDistanceTo20 < bestDistanceTo20) bestIndex = i;
      }
    }

    const [selected] = remaining.splice(bestIndex, 1);
    ordered.push(selected.phrase);
    for (const token of uniqueTokens(tokenize(selected.phrase))) {
      used.add(token);
    }
  }

  return ordered;
}

async function requestOpenAIArray(
  client: OpenAI,
  model: string,
  prompt: string,
): Promise<string[]> {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const direct = parseArrayResponse(raw);
  if (direct.length) return direct;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const value of Object.values(parsed)) {
      if (Array.isArray(value)) {
        return value.map((item) => String(item ?? ""));
      }
    }
  } catch {
    return [];
  }

  return [];
}

function splitFallbackTags(
  title: string,
  description: string,
): { targetTags: string[]; discoveryTags: string[] } {
  const compactDescription = compactGenerationDescription(description);
  const titleWords = uniqueTokens(tokenize(title));
  const descriptionWords = buildDescriptionTokens(compactDescription);
  const base = normalizeResponse([...titleWords, ...descriptionWords]);
  const targetTags = base.slice(0, 8);
  const used = new Set(targetTags);
  const discoveryTags = fillDiscoveryFromKeywords(
    buildKeywords(targetTags, title, compactDescription),
    used,
    Math.max(13 - targetTags.length, 0),
  );
  return { targetTags, discoveryTags };
}

export async function generateTags(title: string, description: string): Promise<GeneratedTags> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const fallback = splitFallbackTags(title, description);
    return {
      tags: {
        target: fallback.targetTags,
        discovery: fallback.discoveryTags,
      },
      source: "fallback",
    };
  }

  const client = new OpenAI({ apiKey: key });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const compactDescription = compactGenerationDescription(description);

  const firstPrompt = `Imagine you are a real Etsy customer trying to find this exact item. Write the phrases you would type into the Etsy search bar to find it. Return valid JSON only. It's important that each phrase must be <= 20 characters. Phrases should be what an average person is most likely to type off the top of their head. Only phrases a non-technical person, who doesn't know how search engines work, would type. Tags should be standalone buyer search phrases, not sentence fragments. Prioritize searchable product keywords: item type, material, style, color, theme, occasion, recipient, and use case. Do not include filler words or partial phrases like if, so, you, can, does, not, appear, may, vary, contact, help. Ignore dimensions, package counts, sizing-chart details, policies, shipping, refunds, guarantees, care instructions, download instructions, file-format specs, personalization steps, color variation disclaimers, URLs, and seller notes unless a detail is clearly something buyers search for, like 5x7 print or 8oz candle. Every returned tag must make sense by itself as a phrase a real Etsy buyer might search. Never output sentence fragments, partial instruction text, support/contact text, shipping/delivery text, email/download/file-delivery text, quantity/spec fragments, or color-variation disclaimers. If a phrase sounds like it came from a sentence instead of an Etsy search box, reject it and choose a product keyword phrase instead. Do not copy random fragments from the description. Only return phrases a buyer would type to find this product. Once you, as an average Etsy user, have to pause and think about the next phrase, it's time to stop. Output: ["phrase 1", "phrase 2"]. Title: ${title}, Description: ${compactDescription || "(none)"}`;

  const firstResponse = await requestOpenAIArray(client, model, firstPrompt);
  const normalizedTargets = filterLowQualityGeneratedTags(normalizeResponse(firstResponse));
  const targetTags = normalizedTargets.slice(0, 8);

  const keywords = buildKeywords(targetTags, title, compactDescription);
  const secondPrompt = `Imagine you are generating Etsy-style metadata tags for discoverability (coverage and variety). Phrases need to be relevant to the item and make sense as a search phrase to find the item. Phrases should try to end with noun that describes the item. If the noun has to be reused, use the shortest item noun. Create product-search tags, not description fragments. Prefer 2-4 word keyword phrases that a customer would reasonably type on Etsy. Use the description only for product attributes like item type, material, color, style, occasion, recipient, theme, and use case. Use dimensions or quantities only when they are common buyer search terms, not manufacturing specs or package details. Do not output grammar/filler phrases, contact/help text, policy/logistics text, care text, file-delivery text, or random sentence fragments. Do not use device compatibility terms unless the item itself is for that device. Before returning, silently self-check every phrase. Remove any phrase that sounds like a sentence fragment, instruction, policy, support/contact text, shipping/download/file text, color-variation disclaimer, dimension/spec fragment, or random prose. Replace it with a product-focused Etsy search phrase using item type, material, style, color, theme, occasion, recipient, or use case. Tags must describe the product a buyer wants to find. Generate at least 13 phrases <= 20 characters each. Return valid JSON only. Use the following object to help generate ${JSON.stringify(
    keywords,
  )}. Avoid reusing words from Used when possible. Title is your highest-priority keyword pool. Description is your secondary keyword pool. Output: ["phrase 1", "phrase 2"]`;

  const secondResponse = await requestOpenAIArray(client, model, secondPrompt);
  const targetSet = new Set(targetTags);
  const discoveryNeeded = Math.max(13 - targetTags.length, 0);
  const normalizedDiscovery = filterLowQualityGeneratedTags(normalizeResponse(secondResponse)).filter(
    (tag) => !targetSet.has(tag),
  );
  const prioritizedDiscovery = prioritizeDiscoveryByUsedKeywords(
    normalizedDiscovery,
    keywords.used,
  );

  let discoveryTags = prioritizedDiscovery.slice(0, discoveryNeeded);
  if (discoveryTags.length < discoveryNeeded) {
    const existing = new Set([...targetTags, ...discoveryTags]);
    const fill = fillDiscoveryFromKeywords(
      keywords,
      existing,
      discoveryNeeded - discoveryTags.length,
    );
    discoveryTags = [...discoveryTags, ...fill];
  }

  return {
    tags: {
      target: targetTags,
      discovery: discoveryTags,
    },
    source: "model",
  };
}

const PLACEHOLDER_TAGS = [
  "hidden keyword",
  "trend phrase",
  "buyer intent",
  "long tail tag",
  "seo booster",
  "shop discover",
  "niche phrase",
  "smart tag",
  "market match",
  "ranking term",
  "search phrase",
  "listing boost",
  "etsy target",
];

export function getPlaceholderTags() {
  return {
    target: PLACEHOLDER_TAGS.slice(0, 8),
    discovery: PLACEHOLDER_TAGS.slice(8),
  };
}
