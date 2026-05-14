import { describe, expect, it } from "vitest";
import { isAdminEmail } from "@/lib/admin";

describe("isAdminEmail", () => {
  it("allows ace.lowder@gmail.com", () => {
    expect(isAdminEmail("ace.lowder@gmail.com")).toBe(true);
  });

  it("allows different casing and whitespace", () => {
    expect(isAdminEmail("  Ace.Lowder@Gmail.com  ")).toBe(true);
  });

  it("rejects null undefined and other addresses", () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("other@example.com")).toBe(false);
  });
});
