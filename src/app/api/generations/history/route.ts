import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GenerationHistoryRow = {
  id: string;
  created_at: string;
  title: string;
  description: string;
  target_tags: string[];
  discovery_tags: string[];
};

const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 8;

function coercePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = coercePositiveInt(searchParams.get("page"), 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, coercePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT)));

  const from = page * limit;
  const to = from + limit - 1;

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    supabase
      .from("generations")
      .select("id, created_at, title, description, target_tags, discovery_tags")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  if (error || countError) {
    return NextResponse.json({ error: "Could not load generation history." }, { status: 500 });
  }

  const total = count ?? 0;
  const rows = ((data ?? []) as GenerationHistoryRow[]).slice().reverse();

  return NextResponse.json({
    items: rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      title: row.title,
      description: row.description,
      targetTags: Array.isArray(row.target_tags) ? row.target_tags : [],
      discoveryTags: Array.isArray(row.discovery_tags) ? row.discovery_tags : [],
    })),
    page,
    hasPrev: page > 0,
    hasNext: to + 1 < total,
  });
}
