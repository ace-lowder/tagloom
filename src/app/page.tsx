"use client";

import { useState } from "react";

type TagApiResponse = {
  tags: string[];
  source: "model" | "fallback";
  error?: string;
};

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"model" | "fallback" | null>(null);

  async function generateTags() {
    if (!title.trim()) return;

    setError("");
    setLoading(true);
    setTags([]);
    setSource(null);

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      const data = (await response.json()) as TagApiResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not generate tags.");
      }

      setTags(data.tags || []);
      setSource(data.source || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyAllTags() {
    if (!tags.length) return;
    await navigator.clipboard.writeText(tags.join(", "));
  }

  return (
    <main>
      <h1>Tagloom</h1>
      <p>Generate 13 Etsy-ready tags from a title and description.</p>
      <div className="columns">
        <section>
          <h2>Input</h2>

          <p>
            <label htmlFor="title">Listing title</label>
          </p>
          <textarea
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Personalized cotton dad t-shirt"
          />

          <p>
            <label htmlFor="description">Listing description (optional)</label>
          </p>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="100% cotton, v neck, short sleeve"
          />

          <p>
            <button type="button" onClick={generateTags} disabled={loading || !title.trim()}>
              {loading ? "Generating..." : "Generate tags"}
            </button>{" "}
            <button type="button" onClick={copyAllTags} disabled={!tags.length}>
              Copy all
            </button>
          </p>

          {error ? <p>{error}</p> : null}
        </section>

        <section>
          <h2>Generated tags</h2>
          {tags.length ? (
            <>
              <ul>
                {tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
              <p>
                <span>Source: {source}</span>
              </p>
            </>
          ) : (
            <p>No tags yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
