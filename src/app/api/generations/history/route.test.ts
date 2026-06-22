import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logServerError } from "@/lib/errorLogging";
import { GET, PATCH } from "./route";

const getUserMock = vi.fn();
const serverFromMock = vi.fn();
const adminFromMock = vi.fn();
const createAdminMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getUser: getUserMock,
    },
    from: serverFromMock,
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => createAdminMock(),
}));

vi.mock("@/lib/errorLogging", () => ({
  logServerError: vi.fn(async () => undefined),
}));

function makeGetRequest(url: string) {
  return new Request(url, { method: "GET" });
}

function makePatchRequest(body: unknown) {
  return new Request("https://tagloom.test/api/generations/history", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createHistoryQuery(
  rows: unknown[],
  count = rows.length,
  queryError: { code?: string; message: string; details?: string | null; hint?: string | null } | null = null,
) {
  const query: Record<string, unknown> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.is = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.range = vi.fn(async () => ({
    data: queryError ? null : rows,
    error: queryError,
  }));

  const countQuery: Record<string, unknown> = {};
  countQuery.select = vi.fn(() => countQuery);
  countQuery.eq = vi.fn(() => countQuery);
  countQuery.is = vi.fn(() => countQuery);
  countQuery.then =
    (
      resolve: (value: { count: number; error: null }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve({ count, error: null }).then(resolve, reject);
  return {
    query: query as {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      is: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      range: ReturnType<typeof vi.fn>;
    },
    countQuery: countQuery as {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      is: ReturnType<typeof vi.fn>;
      then: (
        resolve: (value: { count: number; error: null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise<unknown>;
    },
  };
}

function createFeedbackQuery(rows: unknown[]) {
  const inGenerationId = vi.fn(async () => ({ data: rows, error: null }));
  const eqUser = vi.fn(() => ({ in: inGenerationId }));
  const select = vi.fn(() => ({ eq: eqUser }));
  return { select, eqUser, inGenerationId };
}

describe("generation history route", () => {
  beforeEach(() => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user_123", email_confirmed_at: "2026-01-01T00:00:00.000Z" } },
    });
    serverFromMock.mockReset();
    adminFromMock.mockReset();
    createAdminMock.mockReset();
    createAdminMock.mockReturnValue({ from: adminFromMock });
    vi.mocked(logServerError).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("excludes archived rows by default and returns archivedAt", async () => {
    const rows = [
      {
        id: "gen_1",
        created_at: "2026-05-08T12:00:00.000Z",
        title: "Active row",
        description: "Description",
        target_tags: ["tag one"],
        discovery_tags: ["tag two"],
        archived_at: null,
      },
    ];
    const { query, countQuery } = createHistoryQuery(rows);
    const feedbackQuery = createFeedbackQuery([
      { generation_id: "gen_1", rating: "up", note: null },
    ]);
    serverFromMock.mockReturnValueOnce(query).mockReturnValueOnce(countQuery);
    adminFromMock.mockReturnValue(feedbackQuery);

    const response = await GET(
      makeGetRequest("https://tagloom.test/api/generations/history") as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          id: "gen_1",
          createdAt: "2026-05-08T12:00:00.000Z",
          title: "Active row",
          description: "Description",
          targetTags: ["tag one"],
          discoveryTags: ["tag two"],
          archivedAt: null,
          feedback: { rating: "up", note: null },
        },
      ],
      page: 0,
      hasPrev: false,
      hasNext: false,
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", "user_123");
    expect(query.is).toHaveBeenCalledWith("archived_at", null);
    expect(countQuery.is).toHaveBeenCalledWith("archived_at", null);
  });

  it("includes archived rows when requested", async () => {
    const { query, countQuery } = createHistoryQuery([
      {
        id: "gen_archived",
        created_at: "2026-05-07T12:00:00.000Z",
        title: "Archived row",
        description: "Archived description",
        target_tags: [],
        discovery_tags: [],
        archived_at: "2026-05-08T12:00:00.000Z",
      },
    ]);
    const feedbackQuery = createFeedbackQuery([
      { generation_id: "gen_archived", rating: "down", note: "Not useful" },
    ]);
    serverFromMock.mockReturnValueOnce(query).mockReturnValueOnce(countQuery);
    adminFromMock.mockReturnValue(feedbackQuery);

    const response = await GET(
      makeGetRequest(
        "https://tagloom.test/api/generations/history?includeArchived=true&limit=100",
      ) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      items: [
        {
          id: "gen_archived",
          archivedAt: "2026-05-08T12:00:00.000Z",
          feedback: { rating: "down", note: "Not useful" },
        },
      ],
    });
    expect(query.is).not.toHaveBeenCalled();
    expect(countQuery.is).not.toHaveBeenCalled();
  });

  it("returns a clear schema failure when the archive column is missing", async () => {
    const { query, countQuery } = createHistoryQuery([], 0, {
      code: "42703",
      message: "column generations.archived_at does not exist",
      details: null,
      hint: null,
    });
    serverFromMock.mockReturnValueOnce(query).mockReturnValueOnce(countQuery);

    const response = await GET(
      makeGetRequest("https://tagloom.test/api/generations/history") as never,
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error:
        "Generation history schema is out of date. Apply supabase/migrations/20260508090000_add_generation_archive.sql.",
    });
    expect(logServerError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "api.generations.history.get",
        userId: "user_123",
      }),
    );
  });

  it("returns a generic clear failure when Supabase query fails", async () => {
    const { query, countQuery } = createHistoryQuery([], 0, {
      code: "PGRST500",
      message: "database unavailable",
      details: null,
      hint: null,
    });
    serverFromMock.mockReturnValueOnce(query).mockReturnValueOnce(countQuery);

    const response = await GET(
      makeGetRequest("https://tagloom.test/api/generations/history") as never,
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Could not load generation history.",
    });
    expect(logServerError).toHaveBeenCalledTimes(1);
    expect(logServerError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "api.generations.history.get",
      }),
    );
  });

  it("logs once when PATCH archive query fails", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: null,
      error: {
        code: "PGRST500",
        message: "db down",
        details: null,
        hint: null,
      },
    }));
    const select = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ select }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    adminFromMock.mockReturnValue({ update });

    const response = await PATCH(
      makePatchRequest({ generationId: "gen_1", action: "archive" }) as never,
    );

    expect(response.status).toBe(500);
    expect(logServerError).toHaveBeenCalledTimes(1);
    expect(logServerError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "api.generations.history.patch",
      }),
    );
  });

  it("archives only the authenticated user's generation", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: { id: "gen_1" },
      error: null,
    }));
    const select = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ select }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    adminFromMock.mockReturnValue({ update });

    const response = await PATCH(
      makePatchRequest({ generationId: "gen_1", action: "archive" }) as never,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true, archivedAt: expect.any(String) });
    expect(update).toHaveBeenCalledWith({ archived_at: expect.any(String) });
    expect(eqId).toHaveBeenCalledWith("id", "gen_1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user_123");
  });

  it("restores an archived generation for the authenticated user", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: { id: "gen_1" },
      error: null,
    }));
    const select = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ select }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    adminFromMock.mockReturnValue({ update });

    const response = await PATCH(
      makePatchRequest({ generationId: "gen_1", action: "restore" }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, archivedAt: null });
    expect(update).toHaveBeenCalledWith({ archived_at: null });
    expect(eqId).toHaveBeenCalledWith("id", "gen_1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user_123");
  });

  it("returns 404 when no generation is updated", async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const select = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ select }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    adminFromMock.mockReturnValue({ update });

    const response = await PATCH(
      makePatchRequest({ generationId: "missing", action: "archive" }) as never,
    );

    expect(response.status).toBe(404);
  });

  it("returns a clear 500 when the admin client is not configured", async () => {
    createAdminMock.mockReturnValueOnce(null);

    const response = await PATCH(
      makePatchRequest({ generationId: "gen_1", action: "archive" }) as never,
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Admin client is not configured.",
    });
  });

  it("returns 403 for unverified users", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "user_123", email_confirmed_at: null } },
    });

    const response = await GET(
      makeGetRequest("https://tagloom.test/api/generations/history") as never,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Confirm your email to continue.",
      code: "email_not_verified",
    });
  });
});
