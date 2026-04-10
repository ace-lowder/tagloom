import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TagGenerator from "./TagGenerator";

vi.mock("framer-motion", async () => {
  const ReactModule = await import("react");
  const stripMotionProps = (props: ReactModule.HTMLAttributes<HTMLElement> & Record<string, unknown>) => {
    const {
      animate,
      initial,
      exit,
      transition,
      whileHover,
      whileTap,
      layout,
      layoutId,
      onAnimationComplete,
      ...rest
    } = props;
    void animate;
    void initial;
    void exit;
    void transition;
    void whileHover;
    void whileTap;
    void layout;
    void layoutId;
    void onAnimationComplete;
    return rest;
  };

  const MotionDiv = ReactModule.forwardRef<HTMLDivElement, ReactModule.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => (
      <div ref={ref} {...stripMotionProps(props)}>
        {children}
      </div>
    ),
  );
  const MotionSpan = ReactModule.forwardRef<HTMLSpanElement, ReactModule.HTMLAttributes<HTMLSpanElement>>(
    ({ children, ...props }, ref) => (
      <span ref={ref} {...stripMotionProps(props)}>
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
  clearFadeMs: 1,
  clearCollapseMs: 1,
  backspaceCharMs: 1,
  cyclePauseMs: 1,
};

const CLEAR_TEST_TIMINGS = {
  ...TEST_TIMINGS,
  showDwellMs: 10,
  clearFadeMs: 80,
  clearCollapseMs: 80,
};
const DEFAULT_TITLE_PLACEHOLDER =
  "e.g. Handmade ceramic coffee mug with minimalist design";

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

function mockGenerateResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: async () => body,
  } as Response);
}

function createFetchMockForGenerator(
  ...generateResponses: Array<Promise<Response> | (() => Promise<Response>)>
) {
  let generateIndex = 0;

  return vi.fn().mockImplementation((input: unknown) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : typeof input === "object" &&
              input !== null &&
              "url" in input &&
              typeof (input as { url?: unknown }).url === "string"
            ? ((input as { url: string }).url)
            : String(input);

    if (url.includes("/api/account/usage")) {
      return mockGenerateResponse({ usageLabel: null });
    }

    const next = generateResponses[generateIndex];
    generateIndex += 1;
    if (!next) {
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    }
    if (typeof next === "function") {
      return next();
    }
    return next;
  });
}

function countGenerateCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([input]) => {
    const url = typeof input === "string" ? input : String(input);
    return url.includes("/api/generate");
  }).length;
}

async function advanceToReveal(title: string, tagCount: number) {
  const ms = 1 + title.length * 1 + 1 + 1 + tagCount * 1 + 40;
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

describe("TagGenerator demo chips", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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
    const shell = screen.getByTestId("generator-shell");
    expect(chips).toHaveLength(expected.length);
    expect(chips.every((chip) => chip.textContent?.trim().length)).toBe(true);
    expect(chips.some((chip) => chip.textContent === "undefined" || chip.textContent === "null")).toBe(false);
    expect(screen.getByTestId("generated-tag-count")).toHaveTextContent(`${expected.length} tags generated`);
    expect(shell).toHaveAttribute("data-clear-phase", "idle");
    expect(shell).toHaveAttribute("data-height-locked", "false");
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

  it("fades full results together, then collapses height, then resumes backspace", async () => {
    const fixture = {
      title: "Clear sequence fixture",
      tags: {
        target: ["alpha", "beta", "gamma"],
        discovery: ["delta", "epsilon", "zeta"],
      },
    };
    const expected = sanitizeExpectedTags(fixture.tags.target, fixture.tags.discovery);

    render(
      <TagGenerator
        demoConfig={{
          timings: CLEAR_TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    await advanceToReveal(fixture.title, expected.length);

    const shell = screen.getByTestId("generator-shell");
    expect(shell).toHaveAttribute("data-height-locked", "false");
    expect(screen.getByTestId("results-block")).toBeInTheDocument();

    await waitFor(() => expect(shell).toHaveAttribute("data-clear-phase", "fading"));
    expect(screen.getByTestId("results-block")).toBeInTheDocument();
    expect(screen.getByTestId("generated-tag-count")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy All" })).toBeInTheDocument();

    await waitFor(() => expect(shell).toHaveAttribute("data-clear-phase", "collapsing"));
    expect(shell).toHaveAttribute("data-height-locked", "true");
    expect(screen.queryByTestId("results-block")).not.toBeInTheDocument();

    await waitFor(() => expect(shell).toHaveAttribute("data-clear-phase", "idle"));
    expect(shell).toHaveAttribute("data-height-locked", "false");

    const titleInput = screen.getByPlaceholderText(
      "e.g. Handmade ceramic coffee mug with minimalist design",
    ) as HTMLInputElement;
    await waitFor(() => expect(titleInput.value.length).toBeLessThan(fixture.title.length));
  });

  it("on partial demo typing focus, clears value and sets full fixture placeholder", async () => {
    const fixture = {
      title: "Full demo title should become placeholder",
      tags: {
        target: ["alpha", "beta", "gamma"],
        discovery: ["delta", "epsilon", "zeta"],
      },
    };

    render(
      <TagGenerator
        demoConfig={{
          timings: TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    const titleInput = screen.getByPlaceholderText(
      DEFAULT_TITLE_PLACEHOLDER,
    ) as HTMLInputElement;

    await waitFor(() => expect(titleInput.value.length).toBeGreaterThan(0));
    expect(titleInput.value.length).toBeLessThan(fixture.title.length);

    fireEvent.focus(titleInput);
    expect(titleInput.value).toBe("");
    expect(titleInput).toHaveAttribute("placeholder", `e.g. ${fixture.title}`);

    fireEvent.change(titleInput, { target: { value: "x" } });
    expect(titleInput).toHaveAttribute("placeholder", DEFAULT_TITLE_PLACEHOLDER);
  });

  it("on backspacing focus, clears value and keeps full fixture placeholder", async () => {
    const fixture = {
      title: "Backspacing demo title placeholder",
      tags: {
        target: ["alpha", "beta", "gamma"],
        discovery: ["delta", "epsilon", "zeta"],
      },
    };

    render(
      <TagGenerator
        demoConfig={{
          timings: CLEAR_TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    const titleInput = screen.getByPlaceholderText(
      DEFAULT_TITLE_PLACEHOLDER,
    ) as HTMLInputElement;

    await waitFor(() => expect(titleInput.value).toBe(fixture.title));
    await waitFor(() => expect(titleInput.value.length).toBeLessThan(fixture.title.length));
    await waitFor(() => expect(titleInput.value.length).toBeGreaterThan(0));

    fireEvent.focus(titleInput);
    expect(titleInput.value).toBe("");
    expect(titleInput).toHaveAttribute("placeholder", `e.g. ${fixture.title}`);
  });

  it("keeps default placeholder when refocusing after user interaction", async () => {
    render(
      <TagGenerator
        demoConfig={{
          timings: TEST_TIMINGS,
          fixtures: [
            {
              title: "Any demo fixture",
              tags: { target: ["a"], discovery: ["b"] },
            },
          ],
        }}
      />,
    );

    const titleInput = screen.getByPlaceholderText(
      DEFAULT_TITLE_PLACEHOLDER,
    ) as HTMLInputElement;

    fireEvent.change(titleInput, { target: { value: "manual title" } });
    fireEvent.blur(titleInput);
    fireEvent.focus(titleInput);

    expect(titleInput).toHaveAttribute("placeholder", DEFAULT_TITLE_PLACEHOLDER);
  });
});

describe("TagGenerator auth unlock flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces placeholder state with unlocking indicator, then shows real tags after auth success", async () => {
    const placeholders = [
      "hidden keyword",
      "trend phrase",
      "buyer intent",
      "long tail tag",
      "seo booster",
      "shop discover",
      "niche phrase",
      "smart tag",
      "market match",
      "ranking term",
      "search phrase",
      "listing boost",
      "etsy target",
    ];
    const realTags = [
      "personalized dad shirt",
      "custom name tee",
      "fathers day shirt",
      "v neck t shirt",
      "gift for dad",
      "custom text shirt",
      "birthday gift dad",
      "short sleeve tee",
      "unisex fit shirt",
      "new dad gift",
      "personalized gift",
      "everyday casual top",
      "custom printed tee",
    ];

    const fetchMock = createFetchMockForGenerator(
      () =>
        mockGenerateResponse({
          status: "paywall",
          reason: "auth_required",
          requestId: "ctx-auth",
          message: "Create account or login.",
          placeholders: { target: placeholders, discovery: [] },
        }),
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                status: "ok",
                requestId: "ctx-auth",
                tags: { target: realTags, discovery: [] },
                source: "model",
                entitlementUsed: "free_credit",
              }),
            } as Response);
          }, 25);
        }),
    );

    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const titleInput = screen.getByPlaceholderText(
      "e.g. Handmade ceramic coffee mug with minimalist design",
    );
    fireEvent.change(titleInput, {
      target: {
        value: "Personalized Dad V-Neck T-Shirt - 100% Cotton Custom Name Shirt",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate 13 Tags" }));

    await screen.findByText("Create an account or log in to unlock this generation for FREE");
    await screen.findByText("hidden keyword");
    expect(screen.getAllByTestId("generated-tag-chip").length).toBeGreaterThan(0);

    act(() => {
      window.dispatchEvent(new CustomEvent("tagloom:auth-success"));
    });

    await waitFor(() =>
      expect(screen.queryByText("Create an account or log in to unlock this generation for FREE")).not.toBeInTheDocument(),
    );
    await screen.findByText("Unlocking tags");
    expect(screen.queryByText("hidden keyword")).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(realTags[0])).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("Unlocking tags")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("hidden keyword")).not.toBeInTheDocument());

    expect(countGenerateCalls(fetchMock)).toBe(2);
    expect(screen.getByRole("button", { name: "Copy All" })).not.toBeDisabled();
  });

  it("shows existing error behavior when auth rerun fails", async () => {
    const placeholders = [
      "hidden keyword",
      "trend phrase",
      "buyer intent",
      "long tail tag",
      "seo booster",
      "shop discover",
      "niche phrase",
      "smart tag",
      "market match",
      "ranking term",
      "search phrase",
      "listing boost",
      "etsy target",
    ];

    const fetchMock = createFetchMockForGenerator(
      () =>
        mockGenerateResponse({
          status: "paywall",
          reason: "auth_required",
          requestId: "ctx-auth-fail",
          message: "Create account or login.",
          placeholders: { target: placeholders, discovery: [] },
        }),
      () =>
        mockGenerateResponse(
          {
            error: "Could not generate tags.",
          },
          false,
        ),
    );

    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const titleInput = screen.getByPlaceholderText(
      "e.g. Handmade ceramic coffee mug with minimalist design",
    );
    fireEvent.change(titleInput, {
      target: {
        value: "Personalized Dad V-Neck T-Shirt - 100% Cotton Custom Name Shirt",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate 13 Tags" }));

    await screen.findByText("Create an account or log in to unlock this generation for FREE");
    expect(screen.getByText("hidden keyword")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent("tagloom:auth-success"));
    });

    await screen.findByText("Could not generate tags.");
    expect(screen.queryByText("Unlocking tags")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden keyword")).not.toBeInTheDocument();
    expect(countGenerateCalls(fetchMock)).toBe(2);
  });

  it("does not trigger unlock rerun for non-auth paywall reasons", async () => {
    const fetchMock = createFetchMockForGenerator(() =>
      mockGenerateResponse({
        status: "paywall",
        reason: "payment_required",
        requestId: "ctx-paid",
        message: "You have no remaining generation credits.",
        placeholders: {
          target: ["hidden keyword", "trend phrase", "buyer intent"],
          discovery: [],
        },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const titleInput = screen.getByPlaceholderText(
      "e.g. Handmade ceramic coffee mug with minimalist design",
    );
    fireEvent.change(titleInput, { target: { value: "Custom Dad Shirt Gift" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate 13 Tags" }));

    await screen.findByText("You have no remaining generation credits.");

    act(() => {
      window.dispatchEvent(new CustomEvent("tagloom:auth-success"));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(countGenerateCalls(fetchMock)).toBe(1);
  });
});
