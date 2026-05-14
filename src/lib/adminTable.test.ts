import { describe, expect, it } from "vitest";
import {
  getAdminSortOrDefault,
  getNextAdminSortState,
  parseAdminSort,
} from "@/lib/adminTable";

describe("parseAdminSort", () => {
  const allowed = ["created_at", "title", "source"] as const;

  it("accepts valid key and direction", () => {
    expect(
      parseAdminSort("title", "asc", allowed),
    ).toEqual({ key: "title", direction: "asc" });
  });

  it("returns null for invalid key", () => {
    expect(parseAdminSort("bad", "asc", allowed)).toBeNull();
  });

  it("returns null for invalid direction", () => {
    expect(parseAdminSort("title", "bad", allowed)).toBeNull();
  });

  it("returns null for missing sort params", () => {
    expect(parseAdminSort(undefined, "asc", allowed)).toBeNull();
    expect(parseAdminSort("title", undefined, allowed)).toBeNull();
  });
});

describe("getNextAdminSortState", () => {
  it("cycles null -> desc -> asc -> null", () => {
    expect(
      getNextAdminSortState(null, "created_at"),
    ).toEqual({ key: "created_at", direction: "desc" });

    expect(
      getNextAdminSortState({ key: "created_at", direction: "desc" }, "created_at"),
    ).toEqual({ key: "created_at", direction: "asc" });
    expect(
      getNextAdminSortState({ key: "created_at", direction: "asc" }, "created_at"),
    ).toBeNull();
  });

  it("defaults to desc for different key", () => {
    expect(
      getNextAdminSortState({ key: "created_at", direction: "asc" }, "title"),
    ).toEqual({ key: "title", direction: "desc" });
  });
});

describe("getAdminSortOrDefault", () => {
  it("returns fallback when sort is null", () => {
    expect(
      getAdminSortOrDefault(null, { key: "created_at", direction: "desc" }),
    ).toEqual({ key: "created_at", direction: "desc" });
  });

  it("returns explicit sort when present", () => {
    expect(
      getAdminSortOrDefault(
        { key: "title", direction: "asc" },
        { key: "created_at", direction: "desc" },
      ),
    ).toEqual({ key: "title", direction: "asc" });
  });
});
