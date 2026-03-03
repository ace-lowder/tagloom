import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const FALLBACK_STOPWORDS = new Set([
  "for",
  "the",
  "and",
  "with",
  "from",
  "your",
  "you",
  "a",
  "an",
  "to",
  "of",
  "in",
  "this",
  "that",
  "is",
  "it",
]);

type ModelTagObject = {
  tag?: string;
};

type ModelBuckets = {
  target?: string[] | ModelTagObject[];
  discovery?: string[] | ModelTagObject[];
};

async function logOpenAIInteraction(input: {
  stage: "generator" | "optimizer";
  model: string;
  prompt: string;
  rawResponse: string;
  title: string;
}) {
  console.log("[openai-interaction]", {
    at: new Date().toISOString(),
    stage: input.stage,
    model: input.model,
    title: input.title,
    prompt: input.prompt,
    rawResponse: input.rawResponse,
  });
}

function normalizeTags(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/[^a-z0-9%\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeResponseTags(input: string[] | ModelTagObject[] | undefined): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => (typeof item === "string" ? item : String(item?.tag ?? "")))
    .map(normalizeTags)
    .filter(Boolean);
}

function fillTo13(tags: string[], fallback: string[]): string[] {
  return [...tags, ...fallback].slice(0, 13);
}

function fallbackKeywords(text: string): string[] {
  return normalizeTags(text)
    .split(" ")
    .filter((word) => word.length > 2 && !FALLBACK_STOPWORDS.has(word));
}

function fallbackTags(title: string, description: string): string[] {
  const words = [...new Set([...fallbackKeywords(title), ...fallbackKeywords(description)])];
  const candidates: string[] = [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (let i = 0; i < words.length; i += 1) {
    candidates.push(words[i]);
    if (words[i + 1]) candidates.push(`${words[i]} ${words[i + 1]}`);
    if (words[i + 2]) candidates.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  if (words.includes("dad")) {
    candidates.push("fathers day gift", "dad birthday gift", "gift for father", "custom dad shirt");
  }

  candidates.push("custom name shirt", "v neck t shirt", "soft cotton tee", "personalized gift");

  for (const candidate of candidates) {
    const tag = normalizeTags(candidate);
    if (!tag || tag.length > 20) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length === 13) break;
  }

  while (out.length < 13) {
    out.push(`tag ${out.length + 1}`);
  }

  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      const fallback = fallbackTags(title, description);
      return NextResponse.json({ tags: fallback, source: "fallback" });
    }

    const client = new OpenAI({ apiKey: key });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const generatorPrompt = `Generate 26 Etsy tags. Return JSON only as {"target":[10 strings],"discovery":[16 strings]}. Each tag must be <=20 chars, spaces not hyphens, no punctuation except %, and no duplicate or near-duplicate phrasing. Prioritize buyer query realism. Make target high-intent and distinct, led by occasion or personalization when relevant. Make discovery expand vocabulary without category drift. Avoid low-intent/generic catalog wording. Title: ${title}\nDescription: ${description || "(none)"}`;

    const generatorCompletion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: generatorPrompt }],
    });
    const generatorRaw = generatorCompletion.choices[0]?.message?.content || "{}";
    await logOpenAIInteraction({
      stage: "generator",
      model,
      prompt: generatorPrompt,
      rawResponse: generatorRaw,
      title,
    });

    const generatorParsed = JSON.parse(generatorRaw) as ModelBuckets;
    const generatorTarget = normalizeResponseTags(generatorParsed.target);
    const generatorDiscovery = normalizeResponseTags(generatorParsed.discovery);
    const generationFallback = [...generatorTarget, ...generatorDiscovery];

    const optimizerPrompt = `Optimize Etsy tags from candidate arrays and recompose meaningfully. Return JSON only as {"target":[5 strings],"discovery":[8 strings]}. Rules: <=20 chars; spaces not hyphens; no punctuation except %; no duplicates or near-duplicates; no product-type drift; no low-intent/generic catalog words. Targets must be complete buyer queries with distinct intent. If listing implies occasion/personalization, preserve both strongly. At least 6 of final 13 must be new phrasings not verbatim from candidates. Title: ${title}\nDescription: ${description || "(none)"}\nCandidates: ${JSON.stringify({ target: generatorTarget, discovery: generatorDiscovery })}`;

    const optimizerCompletion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: optimizerPrompt }],
    });
    const optimizerRaw = optimizerCompletion.choices[0]?.message?.content || "{}";
    await logOpenAIInteraction({
      stage: "optimizer",
      model,
      prompt: optimizerPrompt,
      rawResponse: optimizerRaw,
      title,
    });

    const optimizerParsed = JSON.parse(optimizerRaw) as ModelBuckets;

    const optimizedTarget = normalizeResponseTags(optimizerParsed.target);
    const optimizedDiscovery = normalizeResponseTags(optimizerParsed.discovery);
    const optimizedFinal = [...optimizedTarget, ...optimizedDiscovery].slice(0, 13);

    let tags = optimizedFinal;
    if (optimizedFinal.some((tag) => tag.length > 20)) {
      tags = generationFallback.slice(0, 13);
    }

    if (!tags.length) {
      tags = fallbackTags(title, description);
    }

    if (tags.length < 13) {
      tags = fillTo13(tags, fallbackTags(title, description));
    }

    return NextResponse.json({ tags, source: "model" });
  } catch {
    return NextResponse.json({ tags: [], source: "fallback", error: "Tag generation failed." }, { status: 500 });
  }
}
