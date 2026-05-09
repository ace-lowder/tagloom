import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type LogServerErrorInput = {
  source: string;
  route?: string | null;
  method?: string | null;
  status?: number | null;
  userId?: string | null;
  error: unknown;
  code?: string | null;
  metadata?: Record<string, unknown>;
};

const MAX_MESSAGE_LENGTH = 1000;
const MAX_STACK_LENGTH = 6000;
const MAX_METADATA_STRING_LENGTH = 500;
const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;
const REDACTED = "[redacted]";

const SENSITIVE_KEY_FRAGMENTS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "apikey",
  "clientsecret",
  "servicerole",
  "signature",
  "turnstile",
  "stripe-signature",
  "supabasekey",
  "supabase_key",
  "supabaseanonkey",
  "supabase_anon_key",
  "supabaseservicerole",
  "supabase_service_role",
  "supabaseservicerolekey",
  "supabase_service_role_key",
  "supabaseurl",
  "supabase_url",
  "resend",
  "openai",
];

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function isSensitiveKey(key: string) {
  const normalized = key.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function toJsonSafe(value: unknown, depth: number): JsonValue {
  if (depth > MAX_DEPTH) return "[truncated]";

  if (value === null || value === undefined) return null;

  const valueType = typeof value;
  if (valueType === "string") {
    return truncate(String(value), MAX_METADATA_STRING_LENGTH);
  }
  if (valueType === "number") {
    if (!Number.isFinite(value as number)) return String(value) as JsonValue;
    return value as number;
  }
  if (valueType === "boolean") return value as boolean;
  if (valueType === "bigint") return String(value);
  if (valueType === "symbol") return String(value);
  if (valueType === "function") return "[function]";

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => toJsonSafe(item, depth + 1));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncate(value.message || "Unknown error", MAX_METADATA_STRING_LENGTH),
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof URL) {
    return value.toString();
  }

  if (value && valueType === "object") {
    const output: Record<string, JsonValue> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        output[key] = REDACTED;
      } else {
        output[key] = toJsonSafe(nested, depth + 1);
      }
    }
    return output;
  }

  return truncate(String(value), MAX_METADATA_STRING_LENGTH);
}

export function sanitizeErrorMetadata(value: unknown): unknown {
  return toJsonSafe(value, 0);
}

export function normalizeErrorForLog(error: unknown): {
  message: string;
  stack: string | null;
  code: string | null;
} {
  if (error instanceof Error) {
    const possibleCode =
      "code" in error && typeof (error as { code?: unknown }).code === "string"
        ? (error as { code?: string }).code ?? null
        : null;

    return {
      message: truncate(error.message || "Unknown error", MAX_MESSAGE_LENGTH),
      stack: error.stack ? truncate(error.stack, MAX_STACK_LENGTH) : null,
      code: possibleCode,
    };
  }

  if (error && typeof error === "object") {
    const asRecord = error as Record<string, unknown>;
    const rawMessage =
      typeof asRecord.message === "string"
        ? asRecord.message
        : typeof asRecord.error === "string"
          ? asRecord.error
          : "Unexpected error";

    const rawStack =
      typeof asRecord.stack === "string"
        ? asRecord.stack
        : null;

    const rawCode =
      typeof asRecord.code === "string"
        ? asRecord.code
        : typeof asRecord.type === "string"
          ? asRecord.type
          : null;

    return {
      message: truncate(rawMessage, MAX_MESSAGE_LENGTH),
      stack: rawStack ? truncate(rawStack, MAX_STACK_LENGTH) : null,
      code: rawCode,
    };
  }

  return {
    message: truncate(String(error ?? "Unknown error"), MAX_MESSAGE_LENGTH),
    stack: null,
    code: null,
  };
}

export async function logServerError(input: LogServerErrorInput): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) {
      console.error("[error-logging] Supabase admin client unavailable", {
        source: input.source,
        route: input.route ?? null,
      });
      return;
    }

    const normalized = normalizeErrorForLog(input.error);
    const metadata = (sanitizeErrorMetadata(input.metadata ?? {}) as Record<string, JsonValue>) ?? {};

    const { error } = await (admin.from("error_logs") as ReturnType<typeof admin.from> & {
      insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
    }).insert({
      user_id: input.userId ?? null,
      source: input.source,
      route: input.route ?? null,
      method: input.method ?? null,
      status: input.status ?? null,
      code: input.code ?? normalized.code,
      message: normalized.message,
      stack: normalized.stack,
      metadata,
    });

    if (error) {
      console.error("[error-logging] Failed to persist error log", {
        source: input.source,
        route: input.route ?? null,
      });
    }
  } catch {
    console.error("[error-logging] Unexpected logger failure", {
      source: input.source,
      route: input.route ?? null,
    });
  }
}
