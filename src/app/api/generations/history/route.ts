import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GenerationHistoryRow = {
  id: string;
  created_at: string;
  title: string;
  description: string;
  target_tags: string[];
  discovery_tags: string[];
  archived_at: string | null;
};

type ArchiveGenerationRequest = {
  generationId?: unknown;
  action?: unknown;
};

type SupabaseRouteError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MISSING_ARCHIVE_COLUMN_CODE = "42703";
const HISTORY_SCHEMA_ERROR =
  "Generation history schema is out of date. Apply supabase/migrations/20260508090000_add_generation_archive.sql.";

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
  const includeArchived = searchParams.get("includeArchived") === "true";

  const from = page * limit;
  const to = from + limit - 1;

  let dataQuery = supabase
    .from("generations")
    .select("id, created_at, title, description, target_tags, discovery_tags, archived_at")
    .eq("user_id", user.id);
  let countQuery = supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!includeArchived) {
    dataQuery = dataQuery.is("archived_at", null);
    countQuery = countQuery.is("archived_at", null);
  }

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    dataQuery.order("created_at", { ascending: false }).range(from, to),
    countQuery,
  ]);

  if (error || countError) {
    const queryError = error ?? countError;
    console.error("[generations/history] GET failed", {
      code: queryError?.code,
      message: queryError?.message,
      details: queryError?.details,
      hint: queryError?.hint,
      includeArchived,
      page,
      limit,
      userId: user.id,
    });
    if (queryError?.code === MISSING_ARCHIVE_COLUMN_CODE) {
      return NextResponse.json({ error: HISTORY_SCHEMA_ERROR }, { status: 500 });
    }
    return NextResponse.json({ error: "Could not load generation history." }, { status: 500 });
  }

  const total = count ?? 0;
  const rows = (data ?? []) as GenerationHistoryRow[];

  return NextResponse.json({
    items: rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      title: row.title,
      description: row.description,
      targetTags: Array.isArray(row.target_tags) ? row.target_tags : [],
      discoveryTags: Array.isArray(row.discovery_tags) ? row.discovery_tags : [],
      archivedAt: row.archived_at,
    })),
    page,
    hasPrev: page > 0,
    hasNext: to + 1 < total,
  });
}

export async function PATCH(req: NextRequest) {
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

  const body = (await req.json().catch(() => ({}))) as ArchiveGenerationRequest;
  const generationId =
    typeof body.generationId === "string" ? body.generationId.trim() : "";
  const action = typeof body.action === "string" ? body.action : "";

  if (!generationId || (action !== "archive" && action !== "restore")) {
    return NextResponse.json({ error: "Invalid history action." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client is not configured." }, { status: 500 });
  }

  const archivedAt = action === "archive" ? new Date().toISOString() : null;
  const { data, error } = await (admin.from("generations") as ReturnType<typeof admin.from> & {
    update: (values: { archived_at: string | null }) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          select: (columns: string) => { maybeSingle: () => Promise<{ data: { id: string } | null; error: SupabaseRouteError | null }> };
        };
      };
    };
  })
    .update({ archived_at: archivedAt })
    .eq("id", generationId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(`[generations/history] PATCH ${action} failed`, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      generationId,
      userId: user.id,
    });
    if (error.code === MISSING_ARCHIVE_COLUMN_CODE) {
      return NextResponse.json({ error: HISTORY_SCHEMA_ERROR }, { status: 500 });
    }
    return NextResponse.json(
      { error: action === "restore" ? "Could not restore generation." : "Could not archive generation." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Generation not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, archivedAt });
}
