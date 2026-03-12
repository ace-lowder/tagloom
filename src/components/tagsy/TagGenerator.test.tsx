import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TagGenerator from "./TagGenerator";

vi.mock("framer-motion", async () => {
  const ReactModule = await import("react");
  const MotionDiv = ReactModule.forwardRef<HTMLDivElement, ReactModule.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    ),
  );
  const MotionSpan = ReactModule.forwardRef<HTMLSpanElement, ReactModule.HTMLAttributes<HTMLSpanElement>>(
    ({ children, ...props }, ref) => (
      <span ref={ref} {...props}>
        {children}
      </span>
    ),
  );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: MotionDiv,
      span: MotionSpan,
    },
  };
});

vi.mock("@/components/auth/AuthController", () => ({
  useAuthController: () => ({
    openAuthModal: vi.fn(),
  }),
}));

const TEST_TIMINGS = {
  typingStartDelayMs: 1,
  typingCharMs: 1,
  generatingDelayMs: 1,
  generatingLoadMs: 1,
  revealStepMs: 1,
  revealTailMs: 1,
  showDwellMs: 5000,
  clearingStartDelayMs: 1,
  backspaceCharMs: 1,
  cyclePauseMs: 1,
};

function sanitizeExpectedTags(target: string[], discovery: string[]) {
  const seen = new Set<string>();
  return [...target, ...discovery].reduce<string[]>((cleaned, rawTag) => {
    const tag = rawTag.trim();
    if (!tag || seen.has(tag)) return cleaned;
    seen.add(tag);
    cleaned.push(tag);
    return cleaned;
  }, []);
}

async function advanceToReveal(title: string, tagCount: number) {
  const ms = 1 + title.length * 1 + 1 + 1 + tagCount * 1 + 40;
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

describe("TagGenerator demo chips", () => {
  it("renders only non-empty chips in demo reveal", async () => {
    const fixture = {
      title: "Demo title",
      tags: {
        target: ["ceramic mug", "coffee gift", "artisan cup"],
        discovery: ["kitchen decor", "housewarming", "handmade"],
      },
    };
    const expected = sanitizeExpectedTags(fixture.tags.target, fixture.tags.discovery);

    render(
      <TagGenerator
        demoConfig={{
          timings: TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    await advanceToReveal(fixture.title, expected.length);

    const chips = screen.getAllByTestId("generated-tag-chip");
    expect(chips).toHaveLength(expected.length);
    expect(chips.every((chip) => chip.textContent?.trim().length)).toBe(true);
    expect(chips.some((chip) => chip.textContent === "undefined" || chip.textContent === "null")).toBe(false);
    expect(screen.getByTestId("generated-tag-count")).toHaveTextContent(`${expected.length} tags generated`);
  });

  it("sanitizes empty, whitespace, and duplicate tags before rendering", async () => {
    const fixture = {
      title: "Dirty tags fixture",
      tags: {
        target: ["floral bookmark", " ", "", "book lover gift", "floral bookmark"],
        discovery: ["  ", "teacher gift", "teacher gift", "cottagecore", ""],
      },
    };
    const expected = sanitizeExpectedTags(fixture.tags.target, fixture.tags.discovery);

    render(
      <TagGenerator
        demoConfig={{
          timings: TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    await advanceToReveal(fixture.title, expected.length);

    const chips = screen.getAllByTestId("generated-tag-chip");
    const chipTexts = chips.map((chip) => chip.textContent?.trim() ?? "");

    expect(chips).toHaveLength(expected.length);
    expect(chipTexts).toEqual(expected);
    expect(chipTexts.some((text) => text.length === 0)).toBe(false);
  });

  it("copies only sanitized visible tags", async () => {
    const fixture = {
      title: "Copy fixture",
      tags: {
        target: ["alpha", " ", "beta", "alpha"],
        discovery: ["gamma", "", "delta"],
      },
    };
    const expected = sanitizeExpectedTags(fixture.tags.target, fixture.tags.discovery);

    render(
      <TagGenerator
        demoConfig={{
          timings: TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    await advanceToReveal(fixture.title, expected.length);
    fireEvent.click(screen.getByRole("button", { name: "Copy All" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected.join(", "));
  });
});
