import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fallbackTags, pickFinalTags, rankCandidateTags, sanitizeModelTags } from "@/lib/tags";

type CoverageMap = {
  what?: string[];
  who?: string[];
  material?: string[];
  style?: string[];
  occasion?: string[];
  use_case?: string[];
};

type TagResponse = {
  tags: string[];
  source: "model" | "fallback";
  pipeline?: {
    target: string[];
    discovery: string[];
    coverageMap?: CoverageMap;
  };
};

type Stage = "generator" | "optimizer" | "auditor";

type ModelTagObject = {
  tag?: string;
};

type ModelBuckets = {
  target?: string[] | ModelTagObject[];
  discovery?: string[] | ModelTagObject[];
  coverage_map?: CoverageMap;
};

async function logOpenAIInteraction(input: {
  stage: Stage;
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

function normalizeForAudit(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/[^a-z0-9%\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toTagStrings(input: string[] | ModelTagObject[] | undefined): string[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === "string") return normalizeForAudit(item);
      return normalizeForAudit(String(item?.tag ?? ""));
    })
    .filter(Boolean);
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
      const res: TagResponse = { tags: fallback, source: "fallback" };
      return NextResponse.json(res);
    }

    const client = new OpenAI({ apiKey: key });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const generatorPrompt = `Generate 26 Etsy tags and return JSON only: {"target":[10 strings],"discovery":[16 strings]}. Keep each tag <=20 characters, use spaces not hyphens, and remove punctuation except %. No duplicates or near-duplicates. Prioritize real buyer queries over feature fragments. Target tags should be high-intent and distinct, with occasion or personalization leading intent. Discovery tags should expand vocabulary while staying in the same product type. Avoid low-intent words and generic catalog words. Title: ${title}\nDescription: ${description || "(none)"}`;

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
    const rankedTarget = rankCandidateTags(toTagStrings(generatorParsed.target), title, description, 10);
    const rankedDiscovery = rankCandidateTags(toTagStrings(generatorParsed.discovery), title, description, 16);

    const optimizerPrompt = `You optimize Etsy tags. Input JSON has candidate arrays target and discovery. Recompose from token-level combinations and return JSON only: {"target":[5 strings],"discovery":[8 strings]}. Keep each tag <=20 characters, spaces not hyphens, no punctuation except %, no duplicates or near-duplicates, no product-type drift, and no low-intent or generic catalog words. Favor high-intent buyer phrasing, distinct purchase intents in target, and wider vocabulary in discovery. Title: ${title}\nDescription: ${description || "(none)"}\nCandidates: ${JSON.stringify({ target: rankedTarget, discovery: rankedDiscovery })}`;

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
    const optimizedTarget = toTagStrings(optimizerParsed.target);
    const optimizedDiscovery = toTagStrings(optimizerParsed.discovery);

    const auditorPrompt = `You audit Etsy tags. Input JSON has optimized target and discovery arrays. Return JSON only: {"target":[5 strings],"discovery":[8 strings],"coverage_map":{"what":[],"who":[],"material":[],"style":[],"occasion":[],"use_case":[]}}. Correct any rule breaks and improve phrasing if needed. Enforce <=20 chars, spaces not hyphens, no punctuation except %, no duplicates, no low-intent/generic catalog words, and no product-type drift. Target must be exact high-intent buyer queries with distinct intent. Discovery must stay relevant and widen vocabulary. Title: ${title}\nDescription: ${description || "(none)"}\nOptimized tags: ${JSON.stringify({ target: optimizedTarget, discovery: optimizedDiscovery })}`;

    const auditorCompletion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: auditorPrompt }],
    });

    const auditorRaw = auditorCompletion.choices[0]?.message?.content || "{}";
    await logOpenAIInteraction({
      stage: "auditor",
      model,
      prompt: auditorPrompt,
      rawResponse: auditorRaw,
      title,
    });

    const auditorParsed = JSON.parse(auditorRaw) as ModelBuckets;

    const selection = pickFinalTags(
      {
        target: toTagStrings(auditorParsed.target).map((tag) => ({ tag })),
        discovery: toTagStrings(auditorParsed.discovery).map((tag) => ({ tag })),
      },
      title,
      description,
    );

    const tags = sanitizeModelTags(selection.tags, title, description);

    const res: TagResponse = {
      tags,
      source: "model",
      pipeline: {
        target: selection.target,
        discovery: selection.discovery,
        coverageMap: auditorParsed.coverage_map,
      },
    };

    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ tags: [], source: "fallback", error: "Tag generation failed." }, { status: 500 });
  }
}
