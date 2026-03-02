import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fallbackTags, sanitizeModelTags } from "@/lib/tags";

type TagResponse = {
  tags: string[];
  source: "model" | "fallback";
};

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

    const prompt = [
      "You generate Etsy tags.",
      "Return ONLY valid JSON with shape: {\"tags\":[\"...\"]}.",
      "Rules:",
      "- Exactly 13 unique tags",
      "- Each tag max 20 characters",
      "- Multi-word tags preferred",
      "- No duplicates, no hashtags, no punctuation clutter",
      "- Keep tags relevant to title/description",
      "- Avoid obvious repeats of the same words",
      "Title:",
      title,
      "Description:",
      description || "(none)",
    ].join("\n");

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as { tags?: string[] };
    const tags = sanitizeModelTags(parsed.tags || [], title, description);

    const res: TagResponse = { tags, source: "model" };
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ tags: [], source: "fallback", error: "Tag generation failed." }, { status: 500 });
  }
}
