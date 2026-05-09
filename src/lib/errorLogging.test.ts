import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  logServerError,
  normalizeErrorForLog,
  sanitizeErrorMetadata,
} from "./errorLogging";

const createSupabaseAdminClientMock = vi.fn();
const insertMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => createSupabaseAdminClientMock(),
}));

describe("error logging", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    insertMock.mockReset();
    createSupabaseAdminClientMock.mockReset();
    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({
        insert: insertMock,
      })),
    });
    insertMock.mockResolvedValue({ error: null });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("redacts nested sensitive metadata keys", () => {
    const result = sanitizeErrorMetadata({
      token: "abc",
      nested: {
        apiKey: "def",
        deeper: {
          stripe_signature: "sig",
          openaiApiKey: "xyz",
          keep: "ok",
        },
      },
    }) as Record<string, unknown>;

    expect(result.token).toBe("[redacted]");
    expect((result.nested as Record<string, unknown>).apiKey).toBe("[redacted]");
    expect(
      ((result.nested as Record<string, unknown>).deeper as Record<string, unknown>).stripe_signature,
    ).toBe("[redacted]");
    expect(
      ((result.nested as Record<string, unknown>).deeper as Record<string, unknown>).openaiApiKey,
    ).toBe("[redacted]");
    expect(
      ((result.nested as Record<string, unknown>).deeper as Record<string, unknown>).keep,
    ).toBe("ok");
  });

  it("preserves safe supabase diagnostic metadata fields", () => {
    const result = sanitizeErrorMetadata({
      supabaseCode: "42703",
      supabaseDetails: "column generations.archived_at does not exist",
      supabaseHint: "Check schema cache",
      supabaseMessage: "Query failed",
    }) as Record<string, unknown>;

    expect(result.supabaseCode).toBe("42703");
    expect(result.supabaseDetails).toBe("column generations.archived_at does not exist");
    expect(result.supabaseHint).toBe("Check schema cache");
    expect(result.supabaseMessage).toBe("Query failed");
  });

  it("redacts supabase keys and urls", () => {
    const result = sanitizeErrorMetadata({
      supabaseServiceRoleKey: "secret",
      supabaseAnonKey: "anon",
      supabaseUrl: "https://example.supabase.co",
    }) as Record<string, unknown>;

    expect(result.supabaseServiceRoleKey).toBe("[redacted]");
    expect(result.supabaseAnonKey).toBe("[redacted]");
    expect(result.supabaseUrl).toBe("[redacted]");
  });

  it("truncates long strings and caps arrays", () => {
    const long = "x".repeat(1000);
    const result = sanitizeErrorMetadata({
      long,
      list: Array.from({ length: 25 }, (_, i) => i),
    }) as Record<string, unknown>;

    expect(String(result.long).length).toBeLessThanOrEqual(501);
    expect((result.list as unknown[]).length).toBe(20);
  });

  it("normalizes Error instances", () => {
    const err = new Error("boom");
    const normalized = normalizeErrorForLog(err);
    expect(normalized.message).toBe("boom");
    expect(normalized.stack).toBeTypeOf("string");
    expect(normalized.code).toBeNull();
  });

  it("normalizes supabase-like objects", () => {
    const normalized = normalizeErrorForLog({
      code: "PGRST100",
      message: "bad query",
      details: "detail",
      hint: "hint",
    });

    expect(normalized.code).toBe("PGRST100");
    expect(normalized.message).toBe("bad query");
  });

  it("normalizes unknown values", () => {
    const normalized = normalizeErrorForLog(42);
    expect(normalized.message).toBe("42");
    expect(normalized.stack).toBeNull();
    expect(normalized.code).toBeNull();
  });

  it("inserts sanitized rows through admin client", async () => {
    await logServerError({
      source: "test.source",
      route: "/api/test",
      method: "POST",
      status: 500,
      userId: "user_123",
      code: "E_TEST",
      error: new Error("boom"),
      metadata: {
        token: "secret",
        message: "x".repeat(900),
      },
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.source).toBe("test.source");
    expect(payload.code).toBe("E_TEST");
    expect((payload.metadata as Record<string, unknown>).token).toBe("[redacted]");
    expect(String((payload.metadata as Record<string, unknown>).message).length).toBeLessThanOrEqual(501);
  });

  it("does not throw when admin client is missing", async () => {
    createSupabaseAdminClientMock.mockReturnValueOnce(null);
    await expect(
      logServerError({
        source: "test.source",
        error: new Error("boom"),
      }),
    ).resolves.toBeUndefined();
  });

  it("does not throw when insert fails", async () => {
    insertMock.mockResolvedValueOnce({ error: { message: "insert failed" } });

    await expect(
      logServerError({
        source: "test.source",
        error: new Error("boom"),
      }),
    ).resolves.toBeUndefined();
  });
});
