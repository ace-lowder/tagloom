import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type RunMetrics = {
  tagCount: number;
  oversized: number;
  duplicates: number;
  oneWord: number;
  totalChars: number;
};

type RunResult = {
  id: string;
  category: string;
  mode: "full" | "title";
  title: string;
  targetTags: string[];
  discoveryTags: string[];
  metrics: RunMetrics;
};

type BenchmarkOutput = {
  version: string;
  createdAt: string;
  dataset: string;
  summary: {
    listings: number;
    generations: number;
    averageTagCount: number;
    oversized: number;
    duplicates: number;
    oneWord: number;
    averageTotalChars: number;
  };
  results: RunResult[];
};

type FlagReason =
  | "mechanical"
  | "process_fragment"
  | "dimension_fragment"
  | "grammar_fragment"
  | "compatibility_fragment"
  | "low_product_value";

type TagFlag = {
  reason: FlagReason;
  id: string;
  category: string;
  mode: "full" | "title";
  title: string;
  tag: string;
};

const resultsDir = join(process.cwd(), "benchmarks", "results");

const exactBadFragments = [
  "stone color quantity",
  "sourced used display",
  "beautiful allows add",
  "mini height diameter",
  "free child name age",
  "returns refunds note",
  "receive printer 5x7",
  "adds unique one kind",
  "ones close every day",
  "shapes match perfect",
  "today level up own",
  "looking create brand",
  "bopp laminated extra",
  "link file check spam",
  "email containing pdf",
  "slightly due monitor",
  "pro air apple pencil",
];

const processTokens = new Set([
  "email",
  "spam",
  "inbox",
  "folder",
  "shipped",
  "shipping",
  "download",
  "file",
  "files",
  "link",
  "links",
  "contact",
  "help",
  "monitor",
  "minutes",
  "quantity",
  "width",
  "returns",
  "refund",
  "refunds",
]);

const dimensionTokens = new Set([
  "mm",
  "cm",
  "inch",
  "inches",
  "diameter",
  "height",
  "width",
  "size",
  "sizes",
  "dimension",
  "dimensions",
  "5x7",
  "8x10",
]);

const compatibilityTokens = new Set([
  "ipad",
  "apple",
  "pencil",
  "pro",
  "air",
  "goodnotes",
  "notability",
  "compatible",
  "compatibility",
  "printer",
]);

const fillerTokens = new Set([
  "adds",
  "add",
  "allows",
  "allow",
  "beautiful",
  "free",
  "today",
  "looking",
  "create",
  "brand",
  "ones",
  "one",
  "own",
  "kind",
  "every",
  "day",
  "used",
  "sourced",
  "note",
  "extra",
]);

const productSignalTokens = new Set([
  "wedding",
  "jewelry",
  "ring",
  "necklace",
  "bracelet",
  "candle",
  "art",
  "print",
  "sticker",
  "planner",
  "template",
  "invite",
  "digital",
  "nursery",
  "baby",
  "gift",
  "decor",
  "mug",
  "shirt",
  "nails",
  "soap",
  "soap",
  "home",
  "custom",
  "personalized",
]);

function normalize(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

function countTokenHits(tokens: string[], set: Set<string>): number {
  let count = 0;
  for (const token of tokens) {
    if (set.has(token)) count += 1;
  }
  return count;
}

function getLatestBenchmarkJson(): string {
  const files = readdirSync(resultsDir)
    .filter((file) => file.endsWith(".json"))
    .sort();

  if (!files.length) {
    throw new Error("No benchmark JSON files found in benchmarks/results");
  }

  return files[files.length - 1] as string;
}

function loadBenchmark(fileArg?: string): { filename: string; data: BenchmarkOutput } {
  const filename = fileArg ?? getLatestBenchmarkJson();
  const fullPath = join(resultsDir, filename);
  const data = JSON.parse(readFileSync(fullPath, "utf8")) as BenchmarkOutput;
  return { filename, data };
}

function flagTag(row: RunResult, tag: string): TagFlag[] {
  const lowered = tag.toLowerCase();
  const normalizedTag = normalize(tag);
  const tokens = tokenize(tag);
  const flags: TagFlag[] = [];

  const hasExactBadFragment = exactBadFragments.some((fragment) =>
    normalizedTag.includes(fragment),
  );

  if (hasExactBadFragment) {
    flags.push({
      reason: "low_product_value",
      id: row.id,
      category: row.category,
      mode: row.mode,
      title: row.title,
      tag,
    });
    return flags;
  }

  const processHits = countTokenHits(tokens, processTokens);
  const dimensionHits = countTokenHits(tokens, dimensionTokens);
  const compatibilityHits = countTokenHits(tokens, compatibilityTokens);
  const fillerHits = countTokenHits(tokens, fillerTokens);
  const productHits = countTokenHits(tokens, productSignalTokens);

  if (processHits >= 2 || /(check\s+spam|email\s+containing|returns?\s+refunds?)/.test(lowered)) {
    flags.push({
      reason: "process_fragment",
      id: row.id,
      category: row.category,
      mode: row.mode,
      title: row.title,
      tag,
    });
  }

  if (dimensionHits >= 2 || /(mini\s+height\s+diameter|quantity\s+size\s+width)/.test(lowered)) {
    flags.push({
      reason: "dimension_fragment",
      id: row.id,
      category: row.category,
      mode: row.mode,
      title: row.title,
      tag,
    });
  }

  if (compatibilityHits >= 2 || /pro\s+air\s+apple\s+pencil/.test(lowered)) {
    flags.push({
      reason: "compatibility_fragment",
      id: row.id,
      category: row.category,
      mode: row.mode,
      title: row.title,
      tag,
    });
  }

  const startsWithWeak = /^(adds|allow|allows|looking|today|ones|beautiful)\b/.test(normalizedTag);
  const endsWithWeak = /\b(one|kind|own|note|extra|day)$/.test(normalizedTag);
  if (startsWithWeak || endsWithWeak) {
    flags.push({
      reason: "grammar_fragment",
      id: row.id,
      category: row.category,
      mode: row.mode,
      title: row.title,
      tag,
    });
  }

  const mostlyWeakLongTag =
    tokens.length >= 4 &&
    fillerHits + processHits >= Math.max(3, tokens.length - 1) &&
    productHits === 0;

  if (mostlyWeakLongTag) {
    flags.push({
      reason: "low_product_value",
      id: row.id,
      category: row.category,
      mode: row.mode,
      title: row.title,
      tag,
    });
  }

  return flags;
}

function buildReport(data: BenchmarkOutput): { mechanical: string[]; flagsByReason: Map<FlagReason, TagFlag[]> } {
  const mechanical: string[] = [];
  if (data.summary.oversized > 0) mechanical.push(`oversized=${data.summary.oversized}`);
  if (data.summary.duplicates > 0) mechanical.push(`duplicates=${data.summary.duplicates}`);
  if (data.summary.oneWord > 0) mechanical.push(`oneWord=${data.summary.oneWord}`);

  const flagsByReason = new Map<FlagReason, TagFlag[]>([
    ["mechanical", []],
    ["process_fragment", []],
    ["dimension_fragment", []],
    ["grammar_fragment", []],
    ["compatibility_fragment", []],
    ["low_product_value", []],
  ]);

  for (const row of data.results) {
    if (row.metrics.oversized > 0 || row.metrics.duplicates > 0 || row.metrics.oneWord > 0) {
      flagsByReason.get("mechanical")?.push({
        reason: "mechanical",
        id: row.id,
        category: row.category,
        mode: row.mode,
        title: row.title,
        tag: `metrics oversized=${row.metrics.oversized} duplicates=${row.metrics.duplicates} oneWord=${row.metrics.oneWord}`,
      });
    }

    const tags = [...row.targetTags, ...row.discoveryTags];
    for (const tag of tags) {
      for (const flagged of flagTag(row, tag)) {
        flagsByReason.get(flagged.reason)?.push(flagged);
      }
    }
  }

  return { mechanical, flagsByReason };
}

function printReport(filename: string, data: BenchmarkOutput) {
  const { mechanical, flagsByReason } = buildReport(data);

  console.log(`file: ${filename}`);
  console.log(`version: ${data.version}`);
  console.log("summary:");
  console.log(JSON.stringify(data.summary, null, 2));

  console.log("mechanical failures:");
  if (!mechanical.length) {
    console.log("  none");
  } else {
    for (const line of mechanical) {
      console.log(`  - ${line}`);
    }
  }

  console.log("suspect tags:");
  for (const reason of [
    "mechanical",
    "process_fragment",
    "dimension_fragment",
    "grammar_fragment",
    "compatibility_fragment",
    "low_product_value",
  ] as const) {
    const entries = flagsByReason.get(reason) ?? [];
    console.log(`  ${reason}: ${entries.length}`);
    for (const entry of entries) {
      console.log(
        `    - id=${entry.id} category=${entry.category} mode=${entry.mode} title=${JSON.stringify(entry.title)} tag=${JSON.stringify(entry.tag)}`,
      );
    }
  }
}

function main() {
  const fileArg = process.argv[2];
  const { filename, data } = loadBenchmark(fileArg);
  printReport(filename, data);
}

main();
