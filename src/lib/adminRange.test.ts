import { describe, expect, it } from "vitest";
import { getAdminRangeStart, parseAdminRange } from "@/lib/adminRange";

describe("parseAdminRange", () => {
  it("parses valid range values", () => {
    expect(parseAdminRange("all")).toBe("all");
    expect(parseAdminRange("1d")).toBe("1d");
    expect(parseAdminRange("7d")).toBe("7d");
    expect(parseAdminRange("30d")).toBe("30d");
  });

  it("falls back to 1d for invalid or missing values", () => {
    expect(parseAdminRange(undefined)).toBe("1d");
    expect(parseAdminRange("bad")).toBe("1d");
    expect(parseAdminRange(["bad", "7d"])).toBe("1d");
  });
});

describe("getAdminRangeStart", () => {
  it("returns null for all", () => {
    expect(getAdminRangeStart("all")).toBeNull();
  });

  it("returns iso strings for rolling ranges", () => {
    expect(typeof getAdminRangeStart("1d")).toBe("string");
    expect(typeof getAdminRangeStart("7d")).toBe("string");
    expect(typeof getAdminRangeStart("30d")).toBe("string");
  });
});
