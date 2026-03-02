const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "with", "from", "by", "at", "is", "it", "this", "that", "your", "you", "our", "my", "me", "we", "they", "them", "as", "be", "are", "was", "were", "can", "will", "new", "best", "gift", "item"
]);

const MODIFIERS = [
  "custom",
  "handmade",
  "personalized",
  "minimalist",
  "small business",
  "unique",
  "gift idea",
  "etsy seller",
  "shop owner",
  "listing help",
  "seo tags",
  "keyword tags",
  "long tail"
];

function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shortenToLimit(tag: string, limit = 20): string {
  if (tag.length <= limit) return tag;
  const words = tag.split(" ");
  const out: string[] = [];
  for (const w of words) {
    const next = [...out, w].join(" ");
    if (next.length <= limit) out.push(w);
    else break;
  }
  return out.join(" ").trim();
}

function uniqueTags(candidates: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    const clean = shortenToLimit(normalize(c));
    if (!clean) continue;
    if (clean.length < 3) continue;
    if (seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length === 13) break;
  }
  return out;
}

function keywordsFromText(input: string): string[] {
  return normalize(input)
    .split(" ")
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function fallbackTags(title: string, description: string): string[] {
  const titleWords = keywordsFromText(title);
  const descWords = keywordsFromText(description);
  const primary = [...new Set([...titleWords.slice(0, 10), ...descWords.slice(0, 10)])];

  const phrases: string[] = [];

  for (let i = 0; i < primary.length; i += 1) {
    phrases.push(primary[i]);
    if (primary[i + 1]) phrases.push(`${primary[i]} ${primary[i + 1]}`);
  }

  for (const p of primary.slice(0, 8)) {
    phrases.push(`${p} gift`);
    phrases.push(`${p} handmade`);
  }

  for (const m of MODIFIERS) {
    if (primary[0]) phrases.push(`${m} ${primary[0]}`);
    phrases.push(m);
  }

  phrases.push("etsy tags");
  phrases.push("listing seo");
  phrases.push("product keywords");

  const tags = uniqueTags(phrases);

  while (tags.length < 13) {
    tags.push(`etsy tag ${tags.length + 1}`);
  }

  return tags.slice(0, 13);
}

export function sanitizeModelTags(rawTags: string[], title: string, description: string): string[] {
  const tags = uniqueTags(rawTags);
  if (tags.length < 13) {
    const fill = fallbackTags(title, description);
    return uniqueTags([...tags, ...fill]).slice(0, 13);
  }
  return tags.slice(0, 13);
}
