import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanGenerationDescription,
  compactGenerationDescription,
  filterLowQualityGeneratedTags,
  GENERATION_LOGIC_VERSION,
  generateTags,
  MAX_GENERATION_DESCRIPTION_LENGTH,
} from "./generation";

function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
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

  it("uses generation logic version 1.4", () => {
    expect(GENERATION_LOGIC_VERSION).toBe("1.4");
  });

  it("cleans generation descriptions safely", () => {
    const noisyDescription = [
      "Digital template svg 3d 8oz 5x7 printable invite sticker",
      "Contact us at hello@example.com or visit https://example.com/listing and www.etsy.com/shop/demo",
      "Need help? ✅ ★ -> 😀 📦",
      "   extra   spacing   ",
    ].join(" ");
    const cleaned = cleanGenerationDescription(noisyDescription);
    const lowered = cleaned.toLowerCase();

    expect(lowered).toContain("digital");
    expect(lowered).toContain("template");
    expect(lowered).toContain("svg");
    expect(lowered).toContain("3d");
    expect(lowered).toContain("8oz");
    expect(lowered).toContain("5x7");
    expect(cleaned).not.toMatch(/https?:\/\//i);
    expect(cleaned).not.toMatch(/\bwww\./i);
    expect(cleaned).not.toMatch(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
    expect(cleaned).not.toContain("✅");
    expect(cleaned).not.toContain("😀");
    expect(cleaned).not.toMatch(/\s{2,}/);
  });

  it("strips filler words from cleaned descriptions", () => {
    const description =
      "if does not appear so you can let us know and we ll gladly help digital template";
    const cleaned = cleanGenerationDescription(description);
    const tokens = normalizeTokens(cleaned);

    for (const filler of ["if", "does", "not", "so", "you", "can", "let", "us", "we", "ll", "help", "appear"]) {
      expect(tokens).not.toContain(filler);
    }
    expect(tokens).toContain("digital");
    expect(tokens).toContain("template");
  });

  it("strips compact measurement and package noise from cleaned descriptions", () => {
    const description =
      "2cm thickness 0.3cm 10pcs 6mm widest point 3d 8oz 5x7 digital template svg";
    const cleaned = cleanGenerationDescription(description);
    const tokens = normalizeTokens(cleaned);

    for (const noisy of ["2cm", "0", "3cm", "10pcs", "6mm", "cm", "mm", "pcs"]) {
      expect(tokens).not.toContain(noisy);
    }
    for (const useful of ["3d", "8oz", "5x7", "digital", "template", "svg"]) {
      expect(tokens).toContain(useful);
    }
  });

  it("caps cleaned description length", () => {
    const longDescription = `${"digital template ".repeat(200)}5x7`;
    const cleaned = cleanGenerationDescription(longDescription);

    expect(cleaned.length).toBeLessThanOrEqual(MAX_GENERATION_DESCRIPTION_LENGTH);
    expect(cleaned.endsWith(" ")).toBe(false);
    expect(cleaned).toContain("digital");
    expect(cleaned).toContain("template");
  });

  it("compacts descriptions by removing process and prose residue", () => {
    const description =
      "link file check spam folder inbox within colours vary steps color everyone quantity width product shipped once digital template wedding invite floral design";
    const compacted = compactGenerationDescription(description);
    const tokens = normalizeTokens(compacted);

    for (const token of [
      "link",
      "file",
      "check",
      "spam",
      "folder",
      "inbox",
      "within",
      "colours",
      "vary",
      "steps",
      "color",
      "everyone",
      "quantity",
      "width",
      "shipped",
      "once",
    ]) {
      expect(tokens).not.toContain(token);
    }
    for (const token of ["digital", "template", "wedding", "invite", "floral", "design"]) {
      expect(tokens).toContain(token);
    }
  });

  it("keeps useful compact product terms in compact descriptions", () => {
    const description =
      "3d nail art 8oz candle 5x7 print svg bundle nickel free earrings custom gift";
    const compacted = compactGenerationDescription(description);
    const tokens = normalizeTokens(compacted);

    for (const token of [
      "3d",
      "nail",
      "art",
      "8oz",
      "candle",
      "5x7",
      "print",
      "svg",
      "bundle",
      "nickel",
      "free",
      "earrings",
      "custom",
      "gift",
    ]) {
      expect(tokens).toContain(token);
    }
  });

  it("filters low quality generated fragments but keeps useful phrases", () => {
    const filtered = filterLowQualityGeneratedTags([
      "link file check spam",
      "feel reach out happy",
      "free works customize",
      "product shipped once",
      "inbox within colours",
      "2 quantity 3 width",
      "nickel free earrings",
      "svg bundle",
      "digital download",
      "5x7 print",
      "8oz candle",
      "3d nail art",
      "custom gift",
    ]);

    for (const bad of [
      "link file check spam",
      "feel reach out happy",
      "free works customize",
      "product shipped once",
      "inbox within colours",
      "2 quantity 3 width",
    ]) {
      expect(filtered).not.toContain(bad);
    }

    for (const good of [
      "nickel free earrings",
      "svg bundle",
      "digital download",
      "5x7 print",
      "8oz candle",
      "3d nail art",
      "custom gift",
    ]) {
      expect(filtered).toContain(good);
    }
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

  it("filters obvious boilerplate tokens from fallback tags", async () => {
    const title = "Personalized Wedding Invitation Template";
    const description =
      "Elegant floral invite design with editable text plus www etsy com listing account settings links minimum dpi svg tiff seller types ai eps.";

    const result = await generateTags(title, description);
    const allTokens = normalizeTokens(
      [...result.tags.target, ...result.tags.discovery].join(" "),
    );
    const banned = [
      "www",
      "etsy",
      "listing",
      "account",
      "settings",
      "minimum",
      "tiff",
      "seller",
    ];

    expect(result.source).toBe("fallback");
    expect([...result.tags.target, ...result.tags.discovery]).toHaveLength(13);
    for (const token of banned) {
      expect(allTokens).not.toContain(token);
    }
  });

  it("preserves useful product terms in fallback tags", async () => {
    const title = "Digital Birthday Invitation Template";
    const description =
      "Printable sticker bundle and invite card set with editable template format for a fast digital party download.";

    const result = await generateTags(title, description);
    const allText = [...result.tags.target, ...result.tags.discovery].join(" ");

    expect(result.source).toBe("fallback");
    expect(
      ["digital", "template", "printable", "sticker", "invite"].some((word) =>
        allText.includes(word),
      ),
    ).toBe(true);
  });

  it("uses cleaned description in fallback generation", async () => {
    const title = "Custom Birthday Party Invite";
    const description =
      "Digital template svg 3d 8oz 5x7 printable sticker invite -- visit https://example.com now, email hello@example.com, and message us 😀 ✓";

    const result = await generateTags(title, description);
    const allText = [...result.tags.target, ...result.tags.discovery].join(" ");
    const allTokens = normalizeTokens(allText);

    expect(result.source).toBe("fallback");
    expect(allText).not.toMatch(/https?:\/\//i);
    expect(allText).not.toMatch(/\bwww\./i);
    expect(allText).not.toMatch(/@/);
    expect(["digital", "template", "svg", "3d", "8oz", "5x7", "sticker", "invite"].some((word) =>
      allTokens.includes(word),
    )).toBe(true);
  });

  it("uses compacted descriptions in fallback generation", async () => {
    const title = "Custom Birthday Party Invite";
    const description =
      "if does not appear so you can let us know and we ll gladly help 2cm thickness 0.3cm 10pcs 6mm point digital template svg 3d 8oz 5x7 printable sticker invite";

    const result = await generateTags(title, description);
    const allTokens = normalizeTokens([...result.tags.target, ...result.tags.discovery].join(" "));

    expect(result.source).toBe("fallback");
    for (const filler of ["if", "does", "not", "so", "you", "can", "let", "us", "we", "ll", "help", "appear"]) {
      expect(allTokens).not.toContain(filler);
    }
    for (const noisy of ["2cm", "10pcs", "6mm", "cm", "mm", "pcs"]) {
      expect(allTokens).not.toContain(noisy);
    }
    expect(["digital", "template", "svg", "3d", "8oz", "5x7", "sticker", "invite"].some((word) =>
      allTokens.includes(word),
    )).toBe(true);
  });

  it("uses compact context in fallback generation", async () => {
    const title = "Floral Wedding Invitation";
    const description =
      "link file check spam folder inbox within colours vary steps color everyone quantity width product shipped once digital template wedding invite floral design";

    const result = await generateTags(title, description);
    const allTokens = normalizeTokens([...result.tags.target, ...result.tags.discovery].join(" "));

    expect(result.source).toBe("fallback");
    for (const token of [
      "link",
      "file",
      "check",
      "spam",
      "folder",
      "inbox",
      "within",
      "colours",
      "vary",
      "steps",
      "color",
      "everyone",
      "quantity",
      "width",
      "shipped",
      "once",
    ]) {
      expect(allTokens).not.toContain(token);
    }
    expect(["digital", "template", "wedding", "invite", "floral", "design"].some((token) =>
      allTokens.includes(token),
    )).toBe(true);
  });

  it("filters file-spec terms only in spec context", async () => {
    const title = "Minimal Printable Wall Art Template";
    const description =
      "Printable art template for modern home decor. Includes svg tiff minimum 300 dpi seller types ai eps specification notes.";

    const result = await generateTags(title, description);
    const allText = [...result.tags.target, ...result.tags.discovery].join(" ");

    expect(result.source).toBe("fallback");
    for (const token of ["svg", "tiff", "dpi", "seller", "ai", "eps"]) {
      expect(allText).not.toContain(token);
    }
    expect(["printable", "art", "template"].some((word) => allText.includes(word))).toBe(true);
  });
});
