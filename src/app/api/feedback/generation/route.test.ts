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
  return new Request("https://tagloom.test/api/feedback/generation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function generationRow() {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "T",
    description: "D",
    target_tags: ["a"],
    discovery_tags: ["b"],
  };
}

describe("generation feedback route", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    fromMock.mockReset();
    vi.mocked(logServerError).mockReset();
    getUserMock.mockResolvedValue({
      data: { user: { id: "user_123", email_confirmed_at: "2026-01-01T00:00:00.000Z" } },
    });
  });

  it("returns 403 when unverified", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "user_123", email_confirmed_at: null } },
    });

    const response = await POST(
      makeRequest({ action: "set", generationId: generationRow().id, rating: "up" }) as never,
    );

    expect(response.status).toBe(403);
  });

  it("returns 404 when generation is missing", async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const eqUser = vi.fn(() => ({ maybeSingle }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const select = vi.fn(() => ({ eq: eqId }));
    fromMock.mockReturnValueOnce({ select });

    const response = await POST(
      makeRequest({ action: "set", generationId: generationRow().id, rating: "up" }) as never,
    );

    expect(response.status).toBe(404);
  });

  it("upserts up feedback with snapshots and note null", async () => {
    const maybeSingle = vi.fn(async () => ({ data: generationRow(), error: null }));
    const eqUser = vi.fn(() => ({ maybeSingle }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const selectGeneration = vi.fn(() => ({ eq: eqId }));

    const singleFeedback = vi.fn(async () => ({ data: { rating: "up", note: null }, error: null }));
    const selectFeedback = vi.fn(() => ({ single: singleFeedback }));
    const upsert = vi.fn(() => ({ select: selectFeedback }));

    fromMock
      .mockReturnValueOnce({ select: selectGeneration })
      .mockReturnValueOnce({ upsert });

    const response = await POST(
      makeRequest({ action: "set", generationId: generationRow().id, rating: "up", note: "ignored" }) as never,
    );

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: "up",
        note: null,
        title_snapshot: "T",
        description_snapshot: "D",
      }),
      { onConflict: "user_id,generation_id" },
    );
    await expect(response.json()).resolves.toEqual({ feedback: { rating: "up", note: null } });
  });

  it("upserts down feedback with note", async () => {
    const maybeSingle = vi.fn(async () => ({ data: generationRow(), error: null }));
    const eqUser = vi.fn(() => ({ maybeSingle }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const selectGeneration = vi.fn(() => ({ eq: eqId }));

    const singleFeedback = vi.fn(async () => ({ data: { rating: "down", note: "bad" }, error: null }));
    const selectFeedback = vi.fn(() => ({ single: singleFeedback }));
    const upsert = vi.fn(() => ({ select: selectFeedback }));

    fromMock
      .mockReturnValueOnce({ select: selectGeneration })
      .mockReturnValueOnce({ upsert });

    const response = await POST(
      makeRequest({ action: "set", generationId: generationRow().id, rating: "down", note: "bad" }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ feedback: { rating: "down", note: "bad" } });
  });

  it("clears feedback", async () => {
    const maybeSingle = vi.fn(async () => ({ data: generationRow(), error: null }));
    const eqUserLookup = vi.fn(() => ({ maybeSingle }));
    const eqIdLookup = vi.fn(() => ({ eq: eqUserLookup }));
    const selectGeneration = vi.fn(() => ({ eq: eqIdLookup }));

    const eqGeneration = vi.fn(async () => ({ error: null }));
    const eqUserDelete = vi.fn(() => ({ eq: eqGeneration }));
    const del = vi.fn(() => ({ eq: eqUserDelete }));

    fromMock
      .mockReturnValueOnce({ select: selectGeneration })
      .mockReturnValueOnce({ delete: del });

    const response = await POST(
      makeRequest({ action: "clear", generationId: generationRow().id }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ feedback: null });
  });

  it("logs and returns 500 on admin failure", async () => {
    const maybeSingle = vi.fn(async () => ({ data: generationRow(), error: null }));
    const eqUser = vi.fn(() => ({ maybeSingle }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const selectGeneration = vi.fn(() => ({ eq: eqId }));

    const singleFeedback = vi.fn(async () => ({ data: null, error: { message: "db down" } }));
    const selectFeedback = vi.fn(() => ({ single: singleFeedback }));
    const upsert = vi.fn(() => ({ select: selectFeedback }));

    fromMock
      .mockReturnValueOnce({ select: selectGeneration })
      .mockReturnValueOnce({ upsert });

    const response = await POST(
      makeRequest({ action: "set", generationId: generationRow().id, rating: "up" }) as never,
    );

    expect(response.status).toBe(500);
    expect(logServerError).toHaveBeenCalledTimes(1);
  });
});
