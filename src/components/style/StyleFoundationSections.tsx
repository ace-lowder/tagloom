"use client";

import { type ReactNode } from "react";
import BrandMark from "@/components/brand/BrandMark";
import { COLOR_SWATCHES } from "./styleFixtures";

export function TypographySection() {
  return (
    <Section title="Typography">
      <div className="space-y-3">
        <h1 className="text-5xl font-semibold">Heading one</h1>
        <h2 className="text-3xl font-semibold">Heading two</h2>
        <h3 className="text-xl font-semibold">Heading three</h3>
        <p className="max-w-2xl text-base text-ink-weak">
          Body text uses a quiet stone tone with enough contrast for repeated
          operational reading.
        </p>
        <p className="text-sm text-stone-500">
          Small text for supporting details and form help.
        </p>
      </div>
    </Section>
  );
}

export function ColorsSection() {
  return (
    <Section title="Colors">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COLOR_SWATCHES.map((swatch) => (
          <div
            key={swatch.name}
            className="rounded-xl border border-line bg-surface p-3"
          >
            <div
              className={`mb-3 h-12 rounded-lg border border-line ${swatch.className}`}
            />
            <p className="text-sm font-semibold">{swatch.name}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function BrandSection() {
  return (
    <Section title="Brand">
      <div className="flex flex-wrap items-center gap-5">
        <div className="inline-flex rounded-xl border border-line bg-surface px-4 py-3">
          <BrandMark />
        </div>
        <button
          type="button"
          className="-m-2 px-2 py-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
        >
          <span className="relative pb-0.5 after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-orange-500 after:transition-transform after:duration-[250ms] hover:after:scale-x-100">
            Nav hover sample
          </span>
        </button>
      </div>
    </Section>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="space-y-5">
      <h2 className="border-b border-line pb-2 text-2xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}
