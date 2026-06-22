import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "./authModal";

describe("auth modal helpers", () => {
  it("rejects protocol-relative and backslash next paths", () => {
    expect(sanitizeNextPath("//evil.example/path")).toBe("/");
    expect(sanitizeNextPath("/safe\\path")).toBe("/");
  });
});

