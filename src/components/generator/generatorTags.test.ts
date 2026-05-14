import { describe, expect, it } from "vitest";
import { getUsageHintText, sanitizeMergedTags } from "./generatorTags";

describe("sanitizeMergedTags", () => {
  it("trims, removes empty tags, and dedupes preserving first-seen order", () => {
    expect(
      sanitizeMergedTags(
        [" mug ", "", " gift", "mug", "  ", "gift "],
        ["gift", "home", " home ", ""],
      ),
    ).toEqual(["mug", "gift", "home"]);
  });
});

describe("getUsageHintText", () => {
  it("returns monthly hint for /100 labels", () => {
    expect(getUsageHintText("34/100", "2026-06-01")).toBe(
      "Monthly includes 100 generations each billing period.",
    );
    expect(getUsageHintText("34/100", null)).toBe(
      "Monthly includes 100 generations each billing period.",
    );
  });

  it("returns starter hint", () => {
    expect(getUsageHintText("Starter 8 left", null)).toBe(
      "Starter generations are prepaid and decrease as you generate.",
    );
  });

  it("returns free hint", () => {
    expect(getUsageHintText("1 free generation", null)).toBe(
      "New accounts get 1 free generation. You can purchase more generations in the pricing section.",
    );
  });

  it("returns null when no matching hint", () => {
    expect(getUsageHintText("Yearly unlimited", null)).toBeNull();
    expect(getUsageHintText(null, null)).toBeNull();
  });
});
