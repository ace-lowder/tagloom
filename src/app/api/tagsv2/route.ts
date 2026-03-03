import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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

type TagResponse = {
  tags: {
    target: string[];
    discovery: string[];
  };
  source: "model" | "fallback";
  error?: string;
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

  // Some models wrap arrays in objects; salvage common shapes.
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 },
      );
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      const fallback = splitFallbackTags(title, description);
      const tags = {
        target: fallback.targetTags,
        discovery: fallback.discoveryTags,
      };
      console.log("[tagsv2] final_tags", tags);
      return NextResponse.json({
        tags,
        source: "fallback",
      } satisfies TagResponse);
    }

    const client = new OpenAI({ apiKey: key });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const firstPrompt = `Imagine you are a real Etsy customer trying to find this exact item. Write the phrases you would type into the Etsy search bar to find it. Return valid JSON only. Each phrase must be <= 20 characters. Phrases should be what an average person is most likely to type off the top of their head. Only phrases a non-technical person, who doesn't know how search engines work, would type. Once you, as an average Etsy user, have to think about the next phrase, it's time to stop. Output: ["phrase 1", "phrase 2"]. Title: ${title}, Description: ${description || "(none)"}`;

    const firstResponse = await requestOpenAIArray(client, model, firstPrompt);
    const normalizedTargets = normalizeResponse(firstResponse);
    const targetTags = normalizedTargets.slice(0, 8);
    console.log("[tagsv2] first_response", firstResponse);
    console.log("[tagsv2] first_normalized_response", normalizedTargets);

    const keywords = buildKeywords(targetTags, title, description);
    const secondPrompt = `Imagine you are generating Etsy-style metadata tags for discoverability (coverage and variety), not exact buyer search phrases. Phrases should try to end with noun, if noun has to be reused, use the shorted noun that describes the item. Generate at least 13 phrases <= 20 characters each. Return valid JSON only. Use the following object to help generate ${JSON.stringify(
      keywords,
    )}. Used should be avoided when possible. Title is your highest-priority keyword pool. Description is your secondary keyword pool. Phrases do not need to be perfect English, but should still be human readable and relevant to the item. Output:
["phrase 1", "phrase 2"]`;

    const secondResponse = await requestOpenAIArray(
      client,
      model,
      secondPrompt,
    );
    const targetSet = new Set(targetTags);
    const discoveryNeeded = Math.max(13 - targetTags.length, 0);
    const normalizedDiscovery = normalizeResponse(secondResponse).filter(
      (tag) => !targetSet.has(tag),
    );
    console.log("[tagsv2] second_response", secondResponse);
    console.log("[tagsv2] second_normalized_response", normalizedDiscovery);

    let discoveryTags = normalizedDiscovery.slice(0, discoveryNeeded);
    if (discoveryTags.length < discoveryNeeded) {
      const existing = new Set([...targetTags, ...discoveryTags]);
      const fill = fillDiscoveryFromKeywords(
        keywords,
        existing,
        discoveryNeeded - discoveryTags.length,
      );
      discoveryTags = [...discoveryTags, ...fill];
    }

    const tags = { target: targetTags, discovery: discoveryTags };
    console.log("[tagsv2] final_tags", tags);

    return NextResponse.json({ tags, source: "model" } satisfies TagResponse);
  } catch {
    return NextResponse.json(
      {
        tags: {
          target: [],
          discovery: [],
        },
        source: "fallback",
        error: "Tag generation failed.",
      } satisfies TagResponse,
      { status: 500 },
    );
  }
}
