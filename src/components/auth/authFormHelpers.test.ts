import { beforeEach, describe, expect, it } from "vitest";
import {
  SIGNUP_COOLDOWN_KEY,
  SIGNUP_COOLDOWN_WINDOW_MS,
  hasRecentSignupCooldown,
  isValidEmail,
  normalizeEmail,
  writeSignupCooldown,
} from "./authFormHelpers";

describe("authFormHelpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("normalizeEmail trims and lowercases", () => {
    expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com");
  });

  it("isValidEmail validates obvious values", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("bad-email")).toBe(false);
    expect(isValidEmail("foo@bar")).toBe(false);
  });

  it("hasRecentSignupCooldown is false when missing", () => {
    expect(hasRecentSignupCooldown()).toBe(false);
  });

  it("hasRecentSignupCooldown is true for fresh timestamp", () => {
    window.localStorage.setItem(SIGNUP_COOLDOWN_KEY, String(Date.now() - 1000));
    expect(hasRecentSignupCooldown()).toBe(true);
  });

  it("hasRecentSignupCooldown is false for expired timestamp", () => {
    window.localStorage.setItem(
      SIGNUP_COOLDOWN_KEY,
      String(Date.now() - SIGNUP_COOLDOWN_WINDOW_MS - 1000),
    );
    expect(hasRecentSignupCooldown()).toBe(false);
  });

  it("writeSignupCooldown writes numeric timestamp", () => {
    writeSignupCooldown();
    const raw = window.localStorage.getItem(SIGNUP_COOLDOWN_KEY);
    expect(raw).not.toBeNull();
    expect(Number.isFinite(Number(raw))).toBe(true);
  });
});
