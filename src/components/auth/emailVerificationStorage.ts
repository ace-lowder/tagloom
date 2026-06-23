"use client";

import { sanitizeNextPath } from "@/lib/authModal";

const EMAIL_VERIFICATION_STORAGE_KEY = "tagloom:email-verification:v1";
const EMAIL_VERIFICATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingEmailVerification = {
  email: string;
  next: string;
  emailSentAt: number;
};

type StoredEmailVerification = PendingEmailVerification;

export function savePendingEmailVerification(record: PendingEmailVerification) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    EMAIL_VERIFICATION_STORAGE_KEY,
    JSON.stringify(record),
  );
}

export function loadPendingEmailVerification(): PendingEmailVerification | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(EMAIL_VERIFICATION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredEmailVerification> | null;
    if (
      !parsed ||
      typeof parsed.email !== "string" ||
      !parsed.email ||
      typeof parsed.next !== "string" ||
      sanitizeNextPath(parsed.next) !== parsed.next ||
      typeof parsed.emailSentAt !== "number" ||
      !Number.isFinite(parsed.emailSentAt)
    ) {
      return null;
    }

    if (Date.now() - parsed.emailSentAt > EMAIL_VERIFICATION_MAX_AGE_MS) {
      clearPendingEmailVerification();
      return null;
    }

    return {
      email: parsed.email,
      next: parsed.next,
      emailSentAt: parsed.emailSentAt,
    };
  } catch {
    return null;
  }
}

export function clearPendingEmailVerification() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(EMAIL_VERIFICATION_STORAGE_KEY);
}

export function hasPendingEmailVerification() {
  return Boolean(loadPendingEmailVerification());
}
