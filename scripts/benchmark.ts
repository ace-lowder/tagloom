import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { GENERATION_LOGIC_VERSION, generateTags } from "../src/lib/generation";

type ListingRow = {
  id: string;
  category: string;
  title: string;
  description: string;
};

type Mode = "full" | "title";

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
  mode: Mode;
  title: string;
  description: string;
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

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    if (!key) continue;

    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }
  return out;
}

function loadEnvIfMissingOpenAiKey() {
  if (process.env.OPENAI_API_KEY) return;

  const files = [".env.local", ".env"];
  for (const file of files) {
    const path = resolve(process.cwd(), file);
    try {
      const parsed = parseEnvFile(readFileSync(path, "utf8"));
      for (const [key, value] of Object.entries(parsed)) {
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    } catch {
      // Ignore missing/unreadable env files.
    }

    if (process.env.OPENAI_API_KEY) return;
  }
}

function parseCsv(contents: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < contents.length; i += 1) {
    const char = contents[i];

    if (inQuotes) {
      if (char === '"') {
        if (contents[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function escapeCsv(value: string): string {
  const safe = String(value ?? "");
  if (safe.includes('"') || safe.includes(",") || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function normalizeForDuplicate(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, " ");
}

function isOneWord(tag: string): boolean {
  return tag.trim().split(/\s+/).filter(Boolean).length === 1;
}

function computeMetrics(targetTags: string[], discoveryTags: string[]): RunMetrics {
  const allTags = [...targetTags, ...discoveryTags];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const tag of allTags) {
    const normalized = normalizeForDuplicate(tag);
    if (!normalized) continue;
    if (seen.has(normalized)) {
      duplicates += 1;
      continue;
    }
    seen.add(normalized);
  }

  return {
    tagCount: allTags.length,
    oversized: allTags.filter((tag) => tag.length > 20).length,
    duplicates,
    oneWord: allTags.filter((tag) => isOneWord(tag)).length,
    totalChars: allTags.reduce((sum, tag) => sum + tag.length, 0),
  };
}

function ensureListings(rows: string[][]): ListingRow[] {
  if (rows.length === 0) return [];

  const header = rows[0].map((col) => col.trim());
  const expectedHeader = ["id", "category", "title", "description"];

  if (header.length !== expectedHeader.length || !expectedHeader.every((col, idx) => header[idx] === col)) {
    throw new Error("benchmarks/listings.csv must use header: id,category,title,description");
  }

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim().length > 0));

  return dataRows.map((row, index) => {
    const [id = "", category = "", title = "", description = ""] = row;
    const lineNumber = index + 2;

    if (!id.trim()) {
      throw new Error(`Row ${lineNumber}: id is required`);
    }
    if (!category.trim()) {
      throw new Error(`Row ${lineNumber}: category is required`);
    }
    if (!title.trim()) {
      throw new Error(`Row ${lineNumber}: title is required`);
    }

    return {
      id: id.trim(),
      category: category.trim(),
      title: title.trim(),
      description: description.trim(),
    };
  });
}

function formatTimestampForFile(date: Date): string {
  return date.toISOString().replace(/:/g, "-").replace(/\..+$/, "");
}

function sanitizeVersionForFile(version: string): string {
  return version.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function toCsv(results: RunResult[]): string {
  const header =
    "id,mode,category,title,tag_count,oversized,duplicates,one_word,total_chars,target_tags,discovery_tags";

  const lines = results.map((row) =>
    [
      row.id,
      row.mode,
      row.category,
      row.title,
      String(row.metrics.tagCount),
      String(row.metrics.oversized),
      String(row.metrics.duplicates),
      String(row.metrics.oneWord),
      String(row.metrics.totalChars),
      row.targetTags.join("|"),
      row.discoveryTags.join("|"),
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [header, ...lines].join("\n");
}

async function run() {
  loadEnvIfMissingOpenAiKey();

  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "Generation benchmark requires OPENAI_API_KEY. This is a manual paid benchmark and is not part of tests/build.",
    );
    process.exit(1);
  }

  const datasetPath = resolve(process.cwd(), "benchmarks/listings.csv");
  const dataset = readFileSync(datasetPath, "utf8");
  const rows = ensureListings(parseCsv(dataset));

  if (rows.length === 0) {
    console.error(
      "No benchmark listings found. Add rows to benchmarks/listings.csv before running.",
    );
    process.exit(1);
  }

  const results: RunResult[] = [];

  for (const listing of rows) {
    const modes: Array<{ mode: Mode; description: string }> = [
      { mode: "full", description: listing.description },
      { mode: "title", description: "" },
    ];

    for (const runMode of modes) {
      const generation = await generateTags(listing.title, runMode.description);
      const targetTags = generation.tags.target;
      const discoveryTags = generation.tags.discovery;
      const metrics = computeMetrics(targetTags, discoveryTags);

      results.push({
        id: listing.id,
        category: listing.category,
        mode: runMode.mode,
        title: listing.title,
        description: runMode.description,
        targetTags,
        discoveryTags,
        metrics,
      });
    }
  }

  const createdAt = new Date();
  const createdAtIso = createdAt.toISOString();

  const summary = {
    listings: rows.length,
    generations: results.length,
    averageTagCount:
      results.reduce((sum, row) => sum + row.metrics.tagCount, 0) / results.length,
    oversized: results.reduce((sum, row) => sum + row.metrics.oversized, 0),
    duplicates: results.reduce((sum, row) => sum + row.metrics.duplicates, 0),
    oneWord: results.reduce((sum, row) => sum + row.metrics.oneWord, 0),
    averageTotalChars:
      results.reduce((sum, row) => sum + row.metrics.totalChars, 0) /
      results.length,
  };

  const output: BenchmarkOutput = {
    version: GENERATION_LOGIC_VERSION,
    createdAt: createdAtIso,
    dataset: "benchmarks/listings.csv",
    summary,
    results,
  };

  const versionForFile = sanitizeVersionForFile(GENERATION_LOGIC_VERSION);
  const stamp = formatTimestampForFile(createdAt);
  const base = `${versionForFile}-${stamp}`;

  const jsonPath = resolve(process.cwd(), `benchmarks/results/${base}.json`);
  const csvPath = resolve(process.cwd(), `benchmarks/results/${base}.csv`);

  writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  writeFileSync(csvPath, `${toCsv(results)}\n`, "utf8");

  console.log(`Benchmark complete: ${results.length} generations`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV: ${csvPath}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
