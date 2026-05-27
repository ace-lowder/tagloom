import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateTags } from "./generation";

function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

describe("generation fallback filler quality", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
      return;
    }
    process.env.OPENAI_API_KEY = originalApiKey;
  });

  it("returns 13 tags with <=20 chars and no normalized duplicates", async () => {
    const title = "Pearl Hair Pins for Wedding Bridal Updo";
    const description =
      "Handmade bridal hair accessories with pearl pin set for wedding hairstyle, bridesmaid gift, and elegant formal event look.";

    const result = await generateTags(title, description);
    const allTags = [...result.tags.target, ...result.tags.discovery];

    expect(result.source).toBe("fallback");
    expect(allTags).toHaveLength(13);
    expect(allTags.every((tag) => tag.length <= 20)).toBe(true);

    const normalized = allTags.map(normalizeTag);
    expect(new Set(normalized).size).toBe(normalized.length);
  });

  it("prefers multi-word discovery phrases when enough keywords exist", async () => {
    const title = "Personalized Teacher Gift Tote Bag";
    const description =
      "Canvas classroom gift tote with custom name print, reusable market bag, end of year thank you present, and teacher appreciation keepsake.";

    const result = await generateTags(title, description);
    const discovery = result.tags.discovery;
    const multiWordCount = discovery.filter((tag) => tag.includes(" ")).length;

    expect(result.source).toBe("fallback");
    expect(discovery.length).toBeGreaterThan(0);
    expect(multiWordCount).toBeGreaterThanOrEqual(discovery.length - 1);
  });

  it("uses fuller character space for discovery fallback tags", async () => {
    const title = "Rustic Farmhouse Wall Decor Sign";
    const description =
      "Modern country kitchen sign with distressed wood style, cozy home accent, handmade wall hanging, and warm family room decor touch.";

    const result = await generateTags(title, description);
    const discovery = result.tags.discovery;
    const totalChars = discovery.reduce((sum, tag) => sum + tag.length, 0);

    expect(result.source).toBe("fallback");
    expect(discovery.length).toBeGreaterThan(0);
    expect(totalChars).toBeGreaterThanOrEqual(discovery.length * 12);
  });

  it("expands keyword variety beyond title-heavy target tags", async () => {
    const title = "Custom Leather Wallet";
    const description =
      "Slim bifold with engraved initials, anniversary keepsake, groomsmen gift idea, travel card organizer, and minimalist everyday carry style.";

    const result = await generateTags(title, description);
    const discoveryText = result.tags.discovery.join(" ");

    expect(result.source).toBe("fallback");
    expect(discoveryText).toContain("anniversary");
    expect(discoveryText).toContain("groomsmen");
    expect(discoveryText).toContain("travel");
  });
});
