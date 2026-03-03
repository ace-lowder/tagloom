function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampTag(tag: string): string {
  if (tag.length <= 20) return tag;

  const words = tag.split(" ");
  const out: string[] = [];

  for (const word of words) {
    const next = [...out, word].join(" ");
    if (next.length > 20) break;
    out.push(word);
  }

  return out.join(" ").trim();
}

function cleanTags(candidates: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const tag = clampTag(normalize(candidate));
    if (!tag || tag.length < 3) continue;
    if (seen.has(tag)) continue;

    seen.add(tag);
    out.push(tag);

    if (out.length === 13) break;
  }

  return out;
}

function keywords(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((word) => word.length > 2);
}

export function fallbackTags(title: string, description: string): string[] {
  const words = [...new Set([...keywords(title), ...keywords(description)])];
  const candidates: string[] = [];

  for (let i = 0; i < words.length; i += 1) {
    candidates.push(words[i]);
    if (words[i + 1]) candidates.push(`${words[i]} ${words[i + 1]}`);
  }

  candidates.push("etsy tags", "product tags", "listing tags", "seo tags");

  const tags = cleanTags(candidates);

  while (tags.length < 13) {
    tags.push(`tag ${tags.length + 1}`);
  }

  return tags.slice(0, 13);
}

export function sanitizeModelTags(rawTags: string[], title: string, description: string): string[] {
  const tags = cleanTags(rawTags || []);
  if (tags.length === 13) return tags;
  return cleanTags([...tags, ...fallbackTags(title, description)]).slice(0, 13);
}
