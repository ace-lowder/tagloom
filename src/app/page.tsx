"use client";

import Image from "next/image";
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
  const [menuOpen, setMenuOpen] = useState(false);

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
    <main className="mx-auto max-w-[1200px] px-4 pb-10 pt-0 md:pt-6">
      <header>
        <nav className="-mx-4 grid grid-cols-[1fr_auto] items-center gap-4 bg-white px-4 py-3 text-lg text-neutral-700 md:mx-0 md:grid-cols-3 md:bg-transparent md:px-0 md:py-0">
          <a href="#" aria-label="Tagloom home" className="block">
            <Image
              src="/logo.png"
              alt="Tagloom"
              width={600}
              height={180}
              className="h-10 w-auto"
              priority
            />
          </a>

          <ul className="hidden items-center justify-self-center gap-8 md:flex">
            <li>
              <a href="#">Features</a>
            </li>
            <li>
              <a href="#">Pricing</a>
            </li>
            <li>
              <a href="#">Reviews</a>
            </li>
          </ul>

          <div className="flex items-center justify-self-end gap-4 md:gap-7">
            <a href="#">Login</a>
            <a
              href="#"
              className="hidden rounded-xl bg-black px-5 py-2.5 text-base text-white md:inline-flex"
            >
              Get Started - Free
            </a>
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="md:hidden"
            >
              {menuOpen ? (
                <span className="relative block h-6 w-6">
                  <span className="absolute left-0 top-1/2 block h-0.5 w-6 -translate-y-1/2 rotate-45 bg-black" />
                  <span className="absolute left-0 top-1/2 block h-0.5 w-6 -translate-y-1/2 -rotate-45 bg-black" />
                </span>
              ) : (
                <span className="block">
                  <span className="block h-0.5 w-6 bg-black" />
                  <span className="mt-1.5 block h-0.5 w-6 bg-black" />
                </span>
              )}
            </button>
          </div>
        </nav>
        {menuOpen ? (
          <div className="-mx-4 rounded-b-2xl bg-white px-6 pb-5 pt-2 md:hidden">
            <ul className="space-y-3 text-lg text-neutral-700">
              <li>
                <a href="#">Features</a>
              </li>
              <li>
                <a href="#">Pricing</a>
              </li>
              <li>
                <a href="#">Reviews</a>
              </li>
            </ul>
          </div>
        ) : null}

        <section className="mx-auto mb-12 mt-20 max-w-4xl text-center">
          <h1 className="mb-5 text-6xl leading-[0.95] md:text-7xl">
            Generate Better Etsy Tags with Tagloom AI
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-neutral-600">
            Build 13 optimized tags in seconds using your listing title and
            description with cleaner buyer intent phrasing.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <a
              href="#"
              className="rounded-2xl bg-primary px-8 py-3 text-lg text-white"
            >
              Generate Tags
            </a>
            <a href="#" className="rounded-2xl border border-black px-8 py-3 text-lg">
              See Example
            </a>
          </div>
        </section>
      </header>

      <section aria-label="tag generator">
        <h2 className="mb-1 text-4xl">Tag Generator</h2>
        <p className="mb-4 text-xl text-neutral-700">
          Generate 13 Etsy-ready tags from a title and description.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-black bg-white p-4">
            <h3 className="mb-3 text-3xl">Input</h3>

            <label htmlFor="title" className="mb-1 block text-lg">
              Listing title
            </label>
            <textarea
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Personalized cotton dad t shirt"
              className="mb-3 min-h-24 w-full rounded-md border border-black p-2"
            />

            <label htmlFor="description" className="mb-1 block text-lg">
              Listing description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="100% cotton, v neck, short sleeve"
              className="mb-3 min-h-24 w-full rounded-md border border-black p-2"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generateTags}
                disabled={loading || !title.trim()}
                className="rounded-md border border-black bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate tags"}
              </button>
              <button
                type="button"
                onClick={copyAllTags}
                disabled={!tags.length}
                className="rounded-md border border-black bg-white px-4 py-2 disabled:opacity-50"
              >
                Copy all
              </button>
            </div>

            {error ? <p className="mt-2 text-red-700">{error}</p> : null}
          </section>

          <section className="rounded-xl border border-black bg-white p-4">
            <h3 className="mb-3 text-3xl">Generated tags</h3>
            {tags.length ? (
              <>
                <ul className="list-disc space-y-1 pl-6">
                  {tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-neutral-700">
                  Source: {source}
                </p>
              </>
            ) : (
              <p>No tags yet.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
