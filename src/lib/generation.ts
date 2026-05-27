import OpenAI from "openai";

export const GENERATION_LOGIC_VERSION = "1.1";

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
  const titleWords = uniqueTokens(tokenize(title));
  const descriptionWords = buildDescriptionTokens(description);
  const base = normalizeResponse([...titleWords, ...descriptionWords]);
  const targetTags = base.slice(0, 8);
  const used = new Set(targetTags);
  const discoveryTags = fillDiscoveryFromKeywords(
    buildKeywords(targetTags, title, description),
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

  const firstPrompt = `Imagine you are a real Etsy customer trying to find this exact item. Write the phrases you would type into the Etsy search bar to find it. Return valid JSON only. It's important that each phrase must be <= 20 characters. Phrases should be what an average person is most likely to type off the top of their head. Only phrases a non-technical person, who doesn't know how search engines work, would type. Ignore shop policies, shipping text, guarantees, URLs, care instructions, dimensions, file requirements, ordering instructions, color variation disclaimers, and seller notes. Only write phrases a buyer would search to find the product itself. Once you, as an average Etsy user, have to pause and think about the next phrase, it's time to stop. Output: ["phrase 1", "phrase 2"]. Title: ${title}, Description: ${description || "(none)"}`;

  const firstResponse = await requestOpenAIArray(client, model, firstPrompt);
  const normalizedTargets = normalizeResponse(firstResponse);
  const targetTags = normalizedTargets.slice(0, 8);

  const keywords = buildKeywords(targetTags, title, description);
  const secondPrompt = `Imagine you are generating Etsy-style metadata tags for discoverability (coverage and variety). Phrases need to be relevant to the item and make sense as a search phrase to find the item. Phrases should try to end with noun that describes the item. If the noun has to be reused, use the shortest item noun. Ignore boilerplate words from policies, URLs, dimensions, file specs, care instructions, download instructions, and seller notes. Do not turn those into tags. Tags must describe the product a buyer wants to find. Generate at least 13 phrases <= 20 characters each. Return valid JSON only. Use the following object to help generate ${JSON.stringify(
    keywords,
  )}. Used should be avoid being used as much as possible. Title is your highest-priority keyword pool. Description is your secondary keyword pool. Output: ["phrase 1", "phrase 2"]`;

  const secondResponse = await requestOpenAIArray(client, model, secondPrompt);
  const targetSet = new Set(targetTags);
  const discoveryNeeded = Math.max(13 - targetTags.length, 0);
  const normalizedDiscovery = normalizeResponse(secondResponse).filter(
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
