export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export type EmailAccountStatus = "missing" | "unverified" | "verified";

export async function getEmailAccountStatus(email: string) {
  const response = await fetch("/api/auth/email-exists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    status?: EmailAccountStatus;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "Could not check account.");
  }

  if (data.status === "missing" || data.status === "unverified" || data.status === "verified") {
    return data.status;
  }

  throw new Error("Could not check account.");
}

export const SIGNUP_COOLDOWN_KEY = "tagloom:signup-cooldown:v1";
export const SIGNUP_COOLDOWN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function hasRecentSignupCooldown() {
  if (typeof window === "undefined") return false;

  const raw = window.localStorage.getItem(SIGNUP_COOLDOWN_KEY);
  if (!raw) return false;

  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp)) return false;

  return Date.now() - timestamp < SIGNUP_COOLDOWN_WINDOW_MS;
}

export function writeSignupCooldown() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIGNUP_COOLDOWN_KEY, String(Date.now()));
}

export async function checkSignupEligibility(turnstileToken: string) {
  const response = await fetch("/api/auth/signup-eligibility", {
    method: "POST",
    headers: {
      "x-turnstile-token": turnstileToken,
    },
  });

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "Could not verify signup eligibility.");
  }

  return data.ok === true;
}
