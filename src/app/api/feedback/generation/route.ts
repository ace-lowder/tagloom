import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/errorLogging";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GenerationFeedbackSetBody = {
  action: "set";
  generationId: string;
  rating: "up" | "down";
  note?: string;
};

type GenerationFeedbackClearBody = {
  action: "clear";
  generationId: string;
};

type GenerationFeedbackBody = GenerationFeedbackSetBody | GenerationFeedbackClearBody;

type GenerationRow = {
  id: string;
  title: string;
  description: string;
  target_tags: string[];
  discovery_tags: string[];
};

const MAX_NOTE_LENGTH = 1000;

function normalizeNote(value: unknown) {
  if (typeof value !== "string") return null;
  const next = value.trim();
  if (!next) return null;
  return next;
}

function isUuidish(value: string) {
  return /^[a-zA-Z0-9-]{16,}$/.test(value);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<GenerationFeedbackBody>;
  const action = body.action;
  const generationId = typeof body.generationId === "string" ? body.generationId.trim() : "";

  if (!action || (action !== "set" && action !== "clear")) {
    return NextResponse.json({ error: "Invalid feedback action." }, { status: 400 });
  }

  if (!generationId || !isUuidish(generationId)) {
    return NextResponse.json({ error: "Invalid generation id." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) {
    return NextResponse.json({ error: "Feedback is not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const generations = generationsTable(admin);
  const generationFeedback = generationFeedbackTable(admin);

  const { data: generation, error: generationError } = await generations
    .select("id, title, description, target_tags, discovery_tags")
    .eq("id", generationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (generationError) {
    await logServerError({
      source: "api.feedback.generation.generation_lookup",
      route: "/api/feedback/generation",
      method: req.method,
      status: 500,
      userId: user.id,
      error: generationError,
      metadata: {
        generationId,
        action,
      },
    });
    return NextResponse.json({ error: "Could not verify generation ownership." }, { status: 500 });
  }

  if (!generation) {
    return NextResponse.json({ error: "Generation not found." }, { status: 404 });
  }

  if (action === "clear") {
    const { error } = await generationFeedback
      .delete()
      .eq("user_id", user.id)
      .eq("generation_id", generationId);

    if (error) {
      await logServerError({
        source: "api.feedback.generation.clear",
        route: "/api/feedback/generation",
        method: req.method,
        status: 500,
        userId: user.id,
        error,
        metadata: {
          generationId,
          action,
        },
      });
      return NextResponse.json({ error: "Could not clear generation feedback." }, { status: 500 });
    }

    return NextResponse.json({ feedback: null });
  }

  const rating = (body as Partial<GenerationFeedbackSetBody>).rating;
  if (rating !== "up" && rating !== "down") {
    return NextResponse.json({ error: "Invalid feedback rating." }, { status: 400 });
  }

  const note = normalizeNote((body as Partial<GenerationFeedbackSetBody>).note);
  if (note && note.length > MAX_NOTE_LENGTH) {
    return NextResponse.json({ error: "Feedback note is too long." }, { status: 400 });
  }

  const nextNote = rating === "up" ? null : note;

  const { data, error } = await generationFeedback
    .upsert(
      {
        user_id: user.id,
        generation_id: generationId,
        rating,
        note: nextNote,
        title_snapshot: generation.title,
        description_snapshot: generation.description,
        target_tags_snapshot: Array.isArray(generation.target_tags) ? generation.target_tags : [],
        discovery_tags_snapshot: Array.isArray(generation.discovery_tags) ? generation.discovery_tags : [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,generation_id" },
    )
    .select("rating, note")
    .single();

  if (error || !data) {
    await logServerError({
      source: "api.feedback.generation.set",
      route: "/api/feedback/generation",
      method: req.method,
      status: 500,
      userId: user.id,
      error: error ?? new Error("Generation feedback upsert returned empty row"),
      metadata: {
        generationId,
        action,
        rating,
        noteLength: nextNote?.length ?? 0,
      },
    });
    return NextResponse.json({ error: "Could not save generation feedback." }, { status: 500 });
  }

  return NextResponse.json({
    feedback: {
      rating: data.rating,
      note: data.note,
    },
  });
}

function generationsTable(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>) {
  return admin.from("generations") as unknown as GenerationsTable;
}

function generationFeedbackTable(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
) {
  return admin.from("generation_feedback") as unknown as GenerationFeedbackTable;
}

type GenerationsTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: GenerationRow | null;
          error: unknown;
        }>;
      };
    };
  };
};

type GenerationFeedbackTable = {
  delete: () => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => Promise<{ error: unknown }>;
    };
  };
  upsert: (
    values: Record<string, unknown>,
    options: { onConflict: string },
  ) => {
    select: (columns: string) => {
      single: () => Promise<{
        data: { rating: "up" | "down"; note: string | null } | null;
        error: unknown;
      }>;
    };
  };
};
