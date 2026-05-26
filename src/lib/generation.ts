import OpenAI from "openai";

export const GENERATION_LOGIC_VERSION = "1.0";

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

type Keywords = {
  used: string[];
  title: string[];
  description: string[];
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

function buildKeywords(
  targetTags: string[],
  title: string,
  description: string,
): Keywords {
  const used = uniqueTokens(targetTags.flatMap((tag) => tokenize(tag)));
  const titleTokens = uniqueTokens(tokenize(title));
  const descriptionTokens = uniqueTokens(tokenize(description));

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
  const phrases: string[] = [];
  const seen = new Set<string>(excluded);
  const pool = [...keywords.title, ...keywords.description];

  for (let i = 0; i < pool.length && phrases.length < needed; i += 1) {
    const unigram = normalizeResponse([pool[i]])[0];
    if (unigram && !seen.has(unigram)) {
      seen.add(unigram);
      phrases.push(unigram);
    }

    if (phrases.length >= needed) break;
    if (!pool[i + 1]) continue;

    const bigram = normalizeResponse([`${pool[i]} ${pool[i + 1]}`])[0];
    if (bigram && !seen.has(bigram)) {
      seen.add(bigram);
      phrases.push(bigram);
    }
  }

  while (phrases.length < needed) {
    const placeholder = `discovery tag ${phrases.length + 1}`;
    const normalized = normalizeResponse([placeholder])[0];
    if (!normalized || seen.has(normalized)) break;
    seen.add(normalized);
    phrases.push(normalized);
  }

  return phrases.slice(0, needed);
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
  const descriptionWords = uniqueTokens(tokenize(description));
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

  const firstPrompt = `Imagine you are a real Etsy customer trying to find this exact item. Write the phrases you would type into the Etsy search bar to find it. Return valid JSON only. It's important that each phrase must be <= 20 characters. Phrases should be what an average person is most likely to type off the top of their head. Only phrases a non-technical person, who doesn't know how search engines work, would type. Once you, as an average Etsy user, have to pause and think about the next phrase, it's time to stop. Output: ["phrase 1", "phrase 2"]. Title: ${title}, Description: ${description || "(none)"}`;

  const firstResponse = await requestOpenAIArray(client, model, firstPrompt);
  const normalizedTargets = normalizeResponse(firstResponse);
  const targetTags = normalizedTargets.slice(0, 8);

  const keywords = buildKeywords(targetTags, title, description);
  const secondPrompt = `Imagine you are generating Etsy-style metadata tags for discoverability (coverage and variety). Phrases need to be relevant to the item and make sense as a search phrase to find the item. Phrases should try to end with noun that describes the item. If the noun has to be reused, use the shortest item noun. Generate at least 13 phrases <= 20 characters each. Return valid JSON only. Use the following object to help generate ${JSON.stringify(
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
