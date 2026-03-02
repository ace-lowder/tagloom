"use client";

import { useMemo, useState } from "react";

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

  const canGenerate = useMemo(() => title.trim().length > 0 && !loading, [title, loading]);

  async function generateTags() {
    setError("");
    setLoading(true);
    setTags([]);
    setSource(null);

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      const data = (await res.json()) as TagApiResponse;
      if (!res.ok) {
        throw new Error(data.error || "Could not generate tags.");
      }

      setTags(data.tags || []);
      setSource(data.source ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyAllTags() {
    if (!tags.length) return;
    await navigator.clipboard.writeText(tags.join(", "));
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "copy_tags_clicked",
        metadata: { tagCount: tags.length },
      }),
    }).catch(() => undefined);
  }

  return (
    <main>
      <h1>Tagloom</h1>
      <p>Generate 13 Etsy-ready tags from a listing in under 60 seconds.</p>

      <section className="card">
        <label htmlFor="title">Listing Title</label>
        <textarea
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Example: Personalized Cotton Dad T-Shirt"
        />

        <label htmlFor="description">Listing Description (Optional)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add materials, style, recipient, and occasion."
        />

        <div className="row">
          <button className="primary" disabled={!canGenerate} onClick={generateTags}>
            {loading ? "Generating..." : "Generate 13 Tags"}
          </button>
          <button className="secondary" disabled={!tags.length} onClick={copyAllTags}>
            Copy All
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}

        {tags.length > 0 ? (
          <>
            <div className="tags">
              {tags.map((tag) => (
                <div key={tag} className="tag">
                  {tag}
                </div>
              ))}
            </div>
            <p className="meta">
              Output source: <strong>{source}</strong>
            </p>
          </>
        ) : null}
      </section>
    </main>
  );
}
