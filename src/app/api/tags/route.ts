import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fallbackTags, normalizeTag, pickFinalTags, sanitizeModelTags } from "@/lib/tags";

type TagResponse = {
  tags: string[];
  source: "model" | "fallback";
  pipeline?: {
    target: string[];
    discovery: string[];
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

function toScoredTags(input: TagScoreObject[] | string[] | undefined): { tag: string; score?: number }[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === "string") return { tag: normalizeTag(item) };
      const rawTag = typeof item?.tag === "string" ? item.tag : "";
      return {
        tag: normalizeTag(rawTag),
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

    const generatorPrompt = [
      "Generate exactly 26 Etsy tags and output valid JSON only.",
      "Schema:",
      "{\"target\":[{\"tag\":\"...\",\"score\":0-100}],\"discovery\":[{\"tag\":\"...\",\"score\":0-100}]}",
      "Requirements:",
      "- target length must be exactly 10",
      "- discovery length must be exactly 16",
      "- each tag <= 20 chars",
      "- use spaces not hyphens (t shirt / v neck)",
      "- keep 100% symbol when relevant (100% cotton)",
      "- no duplicate or near-identical tags",
      "- minimize repeated words across all 26",
      "- target tags are high-intent exact phrases",
      "- discovery tags expand vocabulary and coverage but remain product-relevant",
      "- avoid low-intent words: idea, wear, style, new, established",
      "- do not introduce irrelevant product types",
      "- score each tag 0-100 by how well it follows these rules",
      "Title:",
      title,
      "Description:",
      description || "(none)",
    ].join("\n");

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

    const auditorPrompt = [
      "You are an Etsy SEO auditor and phrase composer.",
      "Input is product title/description and generated tags.",
      "Recompose from scratch using token mix-and-match. Do not preserve original phrasing unless it is best.",
      "Output valid JSON only with schema:",
      "{\"target\":[{\"tag\":\"...\",\"score\":0-100}],\"discovery\":[{\"tag\":\"...\",\"score\":0-100}]}",
      "Requirements:",
      "- output exactly 5 target and 8 discovery tags",
      "- each tag <= 20 chars",
      "- spaces instead of hyphens",
      "- no duplicate or near-identical phrases",
      "- no low-intent words: idea, wear, style, new, established",
      "- stay in product category, no type drift (ex: shirt -> polo/hoodie/pullover)",
      "- target tags are exact high-intent buyer queries with distinct intent",
      "- discovery tags maximize vocabulary coverage while staying relevant",
      "- cover what it is, who it is for, material, style, occasion, use case",
      "- score each returned tag 0-100",
      "Title:",
      title,
      "Description:",
      description || "(none)",
      "Generated candidate tags JSON:",
      JSON.stringify({
        target: generatorTarget,
        discovery: generatorDiscovery,
      }),
    ].join("\n");

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
      },
    };
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ tags: [], source: "fallback", error: "Tag generation failed." }, { status: 500 });
  }
}
