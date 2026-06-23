import { NextRequest, NextResponse } from "next/server";
import { isEmailVerified } from "@/lib/auth";
import { logServerError } from "@/lib/errorLogging";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ArticleFeedbackSetBody = {
  action: "set";
  articleSlug: string;
  rating: "up" | "down";
  note?: string;
};

type ArticleFeedbackClearBody = {
  action: "clear";
  articleSlug: string;
};

type ArticleFeedbackBody = ArticleFeedbackSetBody | ArticleFeedbackClearBody;

const MAX_ARTICLE_SLUG_LENGTH = 160;
const MAX_NOTE_LENGTH = 1000;

function normalizeNote(value: unknown) {
  if (typeof value !== "string") return null;
  const next = value.trim();
  if (!next) return null;
  return next;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<ArticleFeedbackBody>;
  const action = body.action;
  const articleSlug = typeof body.articleSlug === "string" ? body.articleSlug.trim() : "";

  if (!action || (action !== "set" && action !== "clear")) {
    return NextResponse.json({ error: "Invalid feedback action." }, { status: 400 });
  }

  if (!articleSlug || articleSlug.length > MAX_ARTICLE_SLUG_LENGTH) {
    return NextResponse.json({ error: "Invalid article slug." }, { status: 400 });
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

  if (!isEmailVerified(user)) {
    return NextResponse.json(
      { error: "Confirm your email to continue.", code: "email_not_verified" },
      { status: 403 },
    );
  }
  const articleFeedback = articleFeedbackTable(admin);

  if (action === "clear") {
    const { error } = await articleFeedback
      .delete()
      .eq("user_id", user.id)
      .eq("article_slug", articleSlug);

    if (error) {
      await logServerError({
        source: "api.feedback.article.clear",
        route: "/api/feedback/article",
        method: req.method,
        status: 500,
        userId: user.id,
        error,
        metadata: {
          articleSlug,
          action,
        },
      });
      return NextResponse.json({ error: "Could not clear article feedback." }, { status: 500 });
    }

    return NextResponse.json({ feedback: null });
  }

  const rating = (body as Partial<ArticleFeedbackSetBody>).rating;
  if (rating !== "up" && rating !== "down") {
    return NextResponse.json({ error: "Invalid feedback rating." }, { status: 400 });
  }

  const note = normalizeNote((body as Partial<ArticleFeedbackSetBody>).note);
  if (note && note.length > MAX_NOTE_LENGTH) {
    return NextResponse.json({ error: "Feedback note is too long." }, { status: 400 });
  }

  const nextNote = rating === "up" ? null : note;

  const { data, error } = await articleFeedback
    .upsert(
      {
        user_id: user.id,
        article_slug: articleSlug,
        rating,
        note: nextNote,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,article_slug" },
    )
    .select("rating, note")
    .single();

  if (error || !data) {
    await logServerError({
      source: "api.feedback.article.set",
      route: "/api/feedback/article",
      method: req.method,
      status: 500,
      userId: user.id,
      error: error ?? new Error("Article feedback upsert returned empty row"),
      metadata: {
        articleSlug,
        action,
        rating,
        noteLength: nextNote?.length ?? 0,
      },
    });
    return NextResponse.json({ error: "Could not save article feedback." }, { status: 500 });
  }

  return NextResponse.json({
    feedback: {
      rating: data.rating,
      note: data.note,
    },
  });
}

function articleFeedbackTable(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>) {
  return admin.from("support_article_feedback") as unknown as ArticleFeedbackTable;
}

type ArticleFeedbackTable = {
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
