import { beforeEach, describe, expect, it, vi } from "vitest";
import { logServerError } from "@/lib/errorLogging";
import { POST } from "./route";

const getUserMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getUser: getUserMock,
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/errorLogging", () => ({
  logServerError: vi.fn(async () => undefined),
}));

function makeRequest(body: unknown) {
  return new Request("https://tagloom.test/api/feedback/article", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("article feedback route", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    fromMock.mockReset();
    vi.mocked(logServerError).mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: "user_123" } } });
  });

  it("returns 401 when unauthenticated", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });

    const response = await POST(
      makeRequest({ action: "set", articleSlug: "x", rating: "up" }) as never,
    );

    expect(response.status).toBe(401);
  });

  it("upserts up feedback with null note", async () => {
    const single = vi.fn(async () => ({ data: { rating: "up", note: null }, error: null }));
    const select = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select }));
    fromMock.mockReturnValue({ upsert });

    const response = await POST(
      makeRequest({ action: "set", articleSlug: "shipping-help", rating: "up", note: "ignored" }) as never,
    );

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ rating: "up", note: null }),
      { onConflict: "user_id,article_slug" },
    );
    await expect(response.json()).resolves.toEqual({ feedback: { rating: "up", note: null } });
  });

  it("upserts down feedback with optional note", async () => {
    const single = vi.fn(async () => ({ data: { rating: "down", note: "too vague" }, error: null }));
    const select = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select }));
    fromMock.mockReturnValue({ upsert });

    const response = await POST(
      makeRequest({ action: "set", articleSlug: "shipping-help", rating: "down", note: "too vague" }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ feedback: { rating: "down", note: "too vague" } });
  });

  it("clears feedback row", async () => {
    const eqArticle = vi.fn(async () => ({ error: null }));
    const eqUser = vi.fn(() => ({ eq: eqArticle }));
    const del = vi.fn(() => ({ eq: eqUser }));
    fromMock.mockReturnValue({ delete: del });

    const response = await POST(
      makeRequest({ action: "clear", articleSlug: "shipping-help" }) as never,
    );

    expect(response.status).toBe(200);
    expect(eqArticle).toHaveBeenCalledWith("article_slug", "shipping-help");
    await expect(response.json()).resolves.toEqual({ feedback: null });
  });

  it("returns 400 on invalid rating", async () => {
    const response = await POST(
      makeRequest({ action: "set", articleSlug: "shipping-help", rating: "meh" }) as never,
    );

    expect(response.status).toBe(400);
  });

  it("logs and returns 500 on admin failure", async () => {
    const single = vi.fn(async () => ({ data: null, error: { message: "db down" } }));
    const select = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select }));
    fromMock.mockReturnValue({ upsert });

    const response = await POST(
      makeRequest({ action: "set", articleSlug: "shipping-help", rating: "up" }) as never,
    );

    expect(response.status).toBe(500);
    expect(logServerError).toHaveBeenCalledTimes(1);
  });
});
