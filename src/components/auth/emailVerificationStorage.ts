"use client";

import { sanitizeNextPath } from "@/lib/authModal";

const EMAIL_VERIFICATION_STORAGE_KEY = "tagloom:email-verification:v2";
const LEGACY_EMAIL_VERIFICATION_STORAGE_KEY = "tagloom:email-verification:v1";
const EMAIL_VERIFICATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingEmailVerification = {
  email: string;
  next: string;
  createdAt: number;
  emailSentAt: number | null;
};

export function savePendingEmailVerification(record: PendingEmailVerification) {
  if (typeof window === "undefined") return;
  const safeRecord: PendingEmailVerification = {
    email: record.email,
    next: sanitizeNextPath(record.next),
    createdAt: record.createdAt,
    emailSentAt: record.emailSentAt,
  };
  window.localStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, JSON.stringify(safeRecord));
}

export function loadPendingEmailVerification(): PendingEmailVerification | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(EMAIL_VERIFICATION_STORAGE_KEY);
  if (!raw) {
    if (window.localStorage.getItem(LEGACY_EMAIL_VERIFICATION_STORAGE_KEY)) {
      window.localStorage.removeItem(LEGACY_EMAIL_VERIFICATION_STORAGE_KEY);
    }
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingEmailVerification> | null;
    if (
      !parsed ||
      typeof parsed.email !== "string" ||
      !parsed.email ||
      typeof parsed.next !== "string" ||
      sanitizeNextPath(parsed.next) !== parsed.next ||
      typeof parsed.createdAt !== "number" ||
      !Number.isFinite(parsed.createdAt) ||
      !(
        parsed.emailSentAt === null ||
        (typeof parsed.emailSentAt === "number" && Number.isFinite(parsed.emailSentAt))
      )
    ) {
      clearPendingEmailVerification();
      return null;
    }

    if (Date.now() - parsed.createdAt > EMAIL_VERIFICATION_MAX_AGE_MS) {
      clearPendingEmailVerification();
      return null;
    }

    return {
      email: parsed.email,
      next: parsed.next,
      createdAt: parsed.createdAt,
      emailSentAt: parsed.emailSentAt,
    };
  } catch {
    clearPendingEmailVerification();
    return null;
  }
}

export function clearPendingEmailVerification() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(EMAIL_VERIFICATION_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_EMAIL_VERIFICATION_STORAGE_KEY);
}

export function hasPendingEmailVerification() {
  return Boolean(loadPendingEmailVerification());
}
