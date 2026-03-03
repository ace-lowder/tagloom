import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fallbackTags, pickFinalTags, sanitizeModelTags } from "@/lib/tags";

type TagResponse = {
  tags: string[];
  source: "model" | "fallback";
  pipeline?: {
    target: string[];
    discovery: string[];
    coverageMap?: CoverageMap;
  };
};

type TagScoreObject = {
  tag?: string;
  score?: number;
};

type GeneratorModelOutput = {
  target?: TagScoreObject[] | string[];
  discovery?: TagScoreObject[] | string[];
};

type AuditorModelOutput = {
  target?: TagScoreObject[] | string[];
  discovery?: TagScoreObject[] | string[];
  coverage_map?: CoverageMap;
};

type CoverageMap = {
  what?: string[];
  who?: string[];
  material?: string[];
  style?: string[];
  occasion?: string[];
  use_case?: string[];
};

async function logOpenAIInteraction(input: {
  stage: "generator" | "auditor";
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
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toScoredTags(input: TagScoreObject[] | string[] | undefined): { tag: string; score?: number }[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === "string") return { tag: normalizeForAudit(item) };
      const rawTag = typeof item?.tag === "string" ? item.tag : "";
      return {
        tag: normalizeForAudit(rawTag),
        score: typeof item?.score === "number" ? item.score : undefined,
      };
    })
    .filter((item) => item.tag);
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

    const generatorPrompt = `Generate exactly 26 Etsy tags and output valid JSON with keys "target" and "discovery". "target" must contain exactly 10 items and "discovery" must contain exactly 16 items. Output JSON only. Each item must be an object with keys "tag" and "score" where score is 0-100. Each tag must be 20 characters or fewer. Use spaces not hyphens (t shirt / v neck) and keep correct symbols where relevant (100% cotton). Avoid duplicate phrases and minimize repeated words across all tags.

Prioritize buyer search behavior over product-description phrasing. Target tags must be high-intent phrases that mirror real Etsy autocomplete-style searches, natural in wording, complete, commonly typed, and distinct in intent. Avoid semantic overlap (for example, do not include both "gift for dad" and "dad birthday gift"). Use buyer word order. Favor occasion and personalization intent before feature phrasing. Avoid low-intent words (idea, wear, style) and forced modifiers (new, established). Do not add irrelevant product types.

Discovery tags should widen vocabulary coverage while staying fully product-relevant. Prefer 17-20 characters when natural. Maximize unique words, avoid duplicating target intent, avoid filler catalog nouns, and avoid unnatural constructions. Score each tag by how likely a real buyer would type it while still following the constraints.

Title:
${title}

Description:
${description || "(none)"}`;

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

    const generatorParsed = JSON.parse(generatorRaw) as GeneratorModelOutput;
    const generatorTarget = toScoredTags(generatorParsed.target);
    const generatorDiscovery = toScoredTags(generatorParsed.discovery);

    const auditorPrompt = `You are an Etsy SEO auditor and phrase composer. You will receive a product title, product description, and a JSON object with tags split into target and discovery. Recompose tags from scratch using token mix-and-match when helpful; do not preserve original phrasing unless it is actually best.

Return valid JSON only with keys "target", "discovery", and "coverage_map". "target" must contain exactly 5 objects and "discovery" must contain exactly 8 objects. Each object must have keys "tag" and "score" where score is 0-100. "coverage_map" must be an object with keys "what", "who", "material", "style", "occasion", and "use_case", and each value should be an array of the final tags that satisfy that angle.

Each final tag must be 20 characters or fewer. Use spaces instead of hyphens (t shirt / v neck) and correct symbols where relevant (100% cotton). Avoid duplicate or near-identical phrases. Avoid unnatural wording, low-intent words (idea, wear, style), and forced modifiers (new, established). Do not introduce irrelevant product types (for example do not turn shirt into polo, hoodie, or pullover). Penalize generic catalog language such as apparel, clothing, meaningful, unique, and comfortable unless specificity would otherwise be lost.

Prioritize buyer search behavior over product description phrasing. The first 5 tags must be high-intent exact buyer queries with distinct purchase intent and no semantic overlap. Prioritize occasion and personalization intent before style when possible. The remaining 8 tags should widen discovery while staying fully product-relevant, adding new vocabulary and angles without changing category.

Across all 13 final tags, cover: what it is, who it is for, material, style, occasion, and use case. Favor descriptive multi-word phrases and use as much of the 20-character limit as naturally possible. Core nouns like shirt or tee may repeat when necessary, but avoid excessive reuse and minor word swaps that create redundancy.

Title:
${title}

Description:
${description || "(none)"}

Generated candidate tags JSON:
${JSON.stringify({
  target: generatorTarget,
  discovery: generatorDiscovery,
})}`;

    const auditorCompletion = await client.chat.completions.create({
      model,
      temperature: 0.2,
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

    const auditorParsed = JSON.parse(auditorRaw) as AuditorModelOutput;
    const auditorTarget = toScoredTags(auditorParsed.target);
    const auditorDiscovery = toScoredTags(auditorParsed.discovery);
    const coverageMap = auditorParsed.coverage_map;

    const selection = pickFinalTags(
      {
        target: auditorTarget.length ? auditorTarget : generatorTarget,
        discovery: auditorDiscovery.length ? auditorDiscovery : generatorDiscovery,
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
        coverageMap,
      },
    };
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ tags: [], source: "fallback", error: "Tag generation failed." }, { status: 500 });
  }
}
