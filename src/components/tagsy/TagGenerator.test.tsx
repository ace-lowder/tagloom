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
    const motionData = {
      ...(initial ? { "data-motion-initial": JSON.stringify(initial) } : {}),
      ...(animate ? { "data-motion-animate": JSON.stringify(animate) } : {}),
      ...(exit ? { "data-motion-exit": JSON.stringify(exit) } : {}),
    };
    void transition;
    void whileHover;
    void whileTap;
    void layout;
    void layoutId;
    void onAnimationComplete;
    return { ...rest, ...motionData };
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

    if (url.includes("/api/generations/history")) {
      return mockGenerateResponse({
        items: [],
        page: 0,
        hasPrev: false,
        hasNext: false,
      });
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

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

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
    expect(
      chips.every((chip) => chip.getAttribute("data-animation") === "reveal"),
    ).toBe(true);
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
    fireEvent.click(screen.getByRole("button", { name: "Copy all" }));

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
    expect(screen.queryByTestId("results-block") || shell.getAttribute("data-clear-phase") === "collapsing").toBeTruthy();

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

  it("treats generate click like title focus during the demo and does not start generation", async () => {
    const fetchMock = createFetchMockForGenerator();
    vi.stubGlobal("fetch", fetchMock);

    const fixture = {
      title: "Demo title click fixture",
      tags: {
        target: ["alpha", "beta"],
        discovery: ["gamma", "delta"],
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

    const titleInput = screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER) as HTMLInputElement;
    await waitFor(() => expect(titleInput.value.length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: "Generate 13 tags" }));

    await waitFor(() => expect(titleInput.value).toBe(""));
    expect(titleInput).toHaveAttribute("placeholder", `e.g. ${fixture.title}`);
    expect(screen.getByText("Listing Description")).toBeInTheDocument();
    expect(countGenerateCalls(fetchMock)).toBe(0);
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
    fireEvent.click(screen.getByRole("button", { name: "Generate 13 tags" }));

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

    expect(screen.getAllByTestId("generated-tag-chip")[0]).toHaveAttribute(
      "data-animation",
      "reveal",
    );
    expect(countGenerateCalls(fetchMock)).toBe(2);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copy all" })).not.toBeDisabled(),
    );
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
    fireEvent.click(screen.getByRole("button", { name: "Generate 13 tags" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Generate 13 tags" }));

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

describe("TagGenerator usage label info", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders usage label with info trigger for monthly state and shows tooltip on hover/focus", async () => {
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({
          usageLabel: "76/100 generations remaining",
          monthlyResetAt: "2026-05-15T00:00:00.000Z",
        });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(await screen.findByText("76/100 generations remaining")).toBeInTheDocument();

    const infoButton = screen.getByRole("button", { name: "Usage info" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.mouseEnter(infoButton);
    expect(
      await screen.findByText("Monthly includes 100 generations each billing period."),
    ).toBeInTheDocument();
    const resetLink = screen.getByRole("link", { name: /May \d{1,2}, 2026/ });
    expect(resetLink).toHaveAttribute("href", "/billing");

    fireEvent.mouseLeave(infoButton);
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());

    fireEvent.focus(infoButton);
    expect(
      await screen.findByText("Monthly includes 100 generations each billing period."),
    ).toBeInTheDocument();

    fireEvent.blur(infoButton);
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("does not render usage info cluster when usage label is blank", async () => {
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [
            {
              id: "hist_1",
              createdAt: "2026-08-14T00:00:00.000Z",
              title: "History title one",
              description: "Hydrated description from history",
              targetTags: ["tag one"],
              discoveryTags: ["tag two"],
            },
          ],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole("button", { name: "Usage info" })).not.toBeInTheDocument();
    expect(screen.queryByText(/generations remaining/i)).not.toBeInTheDocument();
  });
});

describe("TagGenerator history strip behavior", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const historyItem = (index: number) => ({
    id: `hist_${index}`,
    createdAt: "2026-08-14T12:00:00.000Z",
    title: `History title ${index}`,
    description: `History description ${index}`,
    targetTags: [`tag ${index}`],
    discoveryTags: [],
  });

  const mockHistoryFetch = (items: ReturnType<typeof historyItem>[]) => {
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : typeof input === "object" &&
                input !== null &&
                "url" in input &&
                typeof (input as { url?: unknown }).url === "string"
              ? (input as { url: string }).url
              : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items,
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  const mockPagedHistoryFetch = (
    pages: Record<number, ReturnType<typeof historyItem>[]>,
  ) => {
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : typeof input === "object" &&
                input !== null &&
                "url" in input &&
                typeof (input as { url?: unknown }).url === "string"
              ? (input as { url: string }).url
              : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        const pageMatch = url.match(/[?&]page=(\d+)/);
        const page = pageMatch ? Number(pageMatch[1]) : 0;
        return mockGenerateResponse({
          items: pages[page] ?? [],
          page,
          hasPrev: page > 0,
          hasNext: Boolean(pages[page + 1]),
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("starts with no selected history card when there is no cached selection", async () => {
    window.localStorage.removeItem("tagloom:history:v1");

    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : typeof input === "object" &&
                input !== null &&
                "url" in input &&
                typeof (input as { url?: unknown }).url === "string"
              ? (input as { url: string }).url
              : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [
            {
              id: "hist_1",
              createdAt: "2026-08-14T00:00:00.000Z",
              title: "History title one",
              description: "Hydrated description from history",
              targetTags: ["tag one"],
              discoveryTags: ["tag two"],
            },
          ],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const historyCard = await screen.findByText("History title one");
    expect(historyCard.closest('[role="button"]')).not.toHaveClass("border-orange-400");
  });

  it("renders saved history card date, title, and description preview", async () => {
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : typeof input === "object" &&
                input !== null &&
                "url" in input &&
                typeof (input as { url?: unknown }).url === "string"
              ? (input as { url: string }).url
              : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [
            {
              id: "hist_1",
              createdAt: "2026-08-14T12:00:00.000Z",
              title: "Sterling silver hoop earrings",
              description: "Lightweight hoops with a polished minimalist finish for everyday wear",
              targetTags: ["silver hoops"],
              discoveryTags: ["minimalist jewelry"],
            },
          ],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const title = await screen.findByText("Sterling silver hoop earrings");
    const card = title.closest('[role="button"]');
    expect(card).not.toBeNull();
    const date = screen.getByText("Aug 14th, 2026");
    expect(date).toBeInTheDocument();
    expect(date).toHaveClass("overflow-hidden", "text-ellipsis", "whitespace-nowrap");
    expect(date).not.toHaveClass("pr-14");
    expect(
      screen.getByText("Lightweight hoops with a polished minimal…"),
    ).toBeInTheDocument();
    const cardText = card?.textContent ?? "";
    expect(cardText.indexOf("Aug 14th, 2026")).toBeLessThan(
      cardText.indexOf("Sterling silver hoop earrings"),
    );
    expect(cardText.indexOf("Sterling silver hoop earrings")).toBeLessThan(
      cardText.indexOf("Lightweight hoops with a polished minimal…"),
    );
  });

  it("starts on the newest combined page so draft cards are visible", async () => {
    window.localStorage.setItem(
      "tagloom:history:v1",
      JSON.stringify({
        page0: Array.from({ length: 4 }, (_, index) => historyItem(index + 1)),
        hasPrev: false,
        hasNext: false,
        selectedId: null,
        drafts: [
          {
            id: "draft_newest",
            title: "Newest draft title",
            description: "Newest draft description",
            updatedAt: "2026-08-14T12:00:00.000Z",
          },
        ],
        selectedDraftId: null,
        savedAt: Date.now(),
      }),
    );
    mockHistoryFetch(Array.from({ length: 4 }, (_, index) => historyItem(index + 1)));

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(await screen.findByText("Newest draft title")).toBeInTheDocument();
    expect(screen.queryByText("History title 1")).not.toBeInTheDocument();
    expect(screen.getByText("History title 2")).toBeInTheDocument();
    expect(screen.getByText("History title 3")).toBeInTheDocument();
    expect(screen.getByText("History title 4")).toBeInTheDocument();
  });

  it("renders only four history cards per local page", async () => {
    mockHistoryFetch(Array.from({ length: 5 }, (_, index) => historyItem(index + 1)));

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(await screen.findByText("History title 2")).toBeInTheDocument();
    expect(screen.getByText("History title 3")).toBeInTheDocument();
    expect(screen.getByText("History title 4")).toBeInTheDocument();
    expect(screen.getByText("History title 5")).toBeInTheDocument();
    expect(screen.queryByText("History title 1")).not.toBeInTheDocument();
  });

  it("paginates without selecting or hydrating history cards", async () => {
    mockHistoryFetch(Array.from({ length: 8 }, (_, index) => historyItem(index + 1)));

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(await screen.findByText("History title 5")).toBeInTheDocument();
    expect(screen.queryByText("History title 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Show newer generations"));
    const firstPageCard = await screen.findByText("History title 1");
    expect(firstPageCard.closest('[role="button"]')).not.toHaveClass("border-orange-400");
    expect(screen.queryByDisplayValue("History title 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Show older generations"));
    expect(await screen.findByText("History title 5")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("History title 5")).not.toBeInTheDocument();
  });

  it("stops arrows at valid local page bounds", async () => {
    mockHistoryFetch(Array.from({ length: 5 }, (_, index) => historyItem(index + 1)));

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(await screen.findByText("History title 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Show older generations")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Show older generations"));
    expect(screen.getByText("History title 5")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Show newer generations"));
    expect(await screen.findByText("History title 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Show newer generations")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Show newer generations"));
    expect(screen.getByText("History title 1")).toBeInTheDocument();
    expect(screen.getByText("History title 2")).toBeInTheDocument();
  });

  it("renders sliding pagination dots and jumps to a clicked dot", async () => {
    mockHistoryFetch(Array.from({ length: 24 }, (_, index) => historyItem(index + 1)));

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(await screen.findByText("History title 21")).toBeInTheDocument();
    const dots = screen.getAllByRole("button", { name: /Show history page/ });
    expect(dots).toHaveLength(5);
    expect(screen.queryByLabelText("Show history page 1")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Show history page 6")).toHaveAttribute(
      "aria-current",
      "page",
    );

    fireEvent.click(screen.getByLabelText("Show history page 3"));
    expect(await screen.findByText("History title 9")).toBeInTheDocument();
    expect(screen.getByLabelText("Show history page 3")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("loads all remote pages into one deduped local history list", async () => {
    const fetchMock = mockPagedHistoryFetch({
      0: Array.from({ length: 4 }, (_, index) => historyItem(index + 5)),
      1: [historyItem(1), historyItem(2), historyItem(3), historyItem(5)],
    });

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(await screen.findByText("History title 5")).toBeInTheDocument();
    expect(screen.getByText("History title 6")).toBeInTheDocument();
    expect(screen.getByText("History title 7")).toBeInTheDocument();
    expect(screen.getByText("History title 8")).toBeInTheDocument();
    expect(screen.queryByText("History title 1")).not.toBeInTheDocument();
    expect(screen.getAllByText("History title 5")).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generations/history?limit=8&page=0",
      { method: "GET" },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generations/history?limit=8&page=1",
      { method: "GET" },
    );
  });

  it("renders local page dots after loading multiple remote pages", async () => {
    mockPagedHistoryFetch({
      0: Array.from({ length: 4 }, (_, index) => historyItem(index + 5)),
      1: Array.from({ length: 4 }, (_, index) => historyItem(index + 1)),
    });

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(await screen.findByText("History title 5")).toBeInTheDocument();
    const dots = screen.getAllByRole("button", { name: /Show history page/ });
    expect(dots).toHaveLength(2);
    expect(screen.getByLabelText("Show history page 2")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByLabelText("Show history page 1")).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("clicks a dot without selecting or hydrating a card", async () => {
    mockPagedHistoryFetch({
      0: Array.from({ length: 4 }, (_, index) => historyItem(index + 5)),
      1: Array.from({ length: 4 }, (_, index) => historyItem(index + 1)),
    });

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(await screen.findByText("History title 5")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Show history page 1"));

    const previousPageCard = await screen.findByText("History title 1");
    expect(previousPageCard.closest('[role="button"]')).not.toHaveClass(
      "border-orange-400",
    );
    expect(screen.queryByDisplayValue("History title 1")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Show history page 1")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("uses staggered fade-only card animation", async () => {
    mockHistoryFetch(Array.from({ length: 5 }, (_, index) => historyItem(index + 1)));

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const card = (await screen.findByText("History title 2")).closest(
      '[role="button"]',
    );
    expect(card).toHaveAttribute("data-motion-initial", "{\"opacity\":0}");
    expect(card).toHaveAttribute("data-motion-animate", "{\"opacity\":1}");
    expect(card).toHaveAttribute("data-motion-exit", "{\"opacity\":0}");
    expect(card?.getAttribute("data-motion-initial")).not.toContain("x");
    expect(card?.getAttribute("data-motion-animate")).not.toContain("x");
    expect(card?.getAttribute("data-motion-exit")).not.toContain("x");
  });

  it("shows no selected history card while the demo is active", async () => {
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : typeof input === "object" &&
                input !== null &&
                "url" in input &&
                typeof (input as { url?: unknown }).url === "string"
              ? (input as { url: string }).url
              : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [
            {
              id: "hist_1",
              createdAt: "2026-08-14T00:00:00.000Z",
              title: "History title one",
              description: "Hydrated description from history",
              targetTags: ["tag one"],
              discoveryTags: ["tag two"],
            },
          ],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const historyCard = await screen.findByText("History title one");
    expect(historyCard.closest('[role="button"]')).not.toHaveClass("border-orange-400");
  });

  it("does not show a cached history selection while the demo is active", async () => {
    window.localStorage.setItem(
      "tagloom:history:v1",
      JSON.stringify({
        page0: [
          {
            id: "hist_1",
            createdAt: "2026-08-14T00:00:00.000Z",
            title: "History title one",
            description: "Hydrated description from history",
            targetTags: ["tag one"],
            discoveryTags: ["tag two"],
          },
        ],
        hasPrev: false,
        hasNext: false,
        selectedId: "hist_1",
        draft: null,
        savedAt: Date.now(),
      }),
    );

    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : typeof input === "object" &&
                input !== null &&
                "url" in input &&
                typeof (input as { url?: unknown }).url === "string"
              ? (input as { url: string }).url
              : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [
            {
              id: "hist_1",
              createdAt: "2026-08-14T00:00:00.000Z",
              title: "History title one",
              description: "Hydrated description from history",
              targetTags: ["tag one"],
              discoveryTags: ["tag two"],
            },
          ],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const historyCard = await screen.findByText("History title one");
    expect(historyCard.closest('[role="button"]')).not.toHaveClass("border-orange-400");
  });

  it("renders draft card with no date, single draft label, title, and description, then hydrates it", async () => {
    window.localStorage.setItem(
      "tagloom:history:v1",
      JSON.stringify({
        page0: [],
        hasPrev: false,
        hasNext: false,
        selectedId: null,
        drafts: [
          {
            id: "draft_test",
            title: "My saved draft title",
            description: "Draft description preview text",
            updatedAt: "2026-08-14T12:00:00.000Z",
          },
        ],
        selectedDraftId: null,
        savedAt: Date.now(),
      }),
    );

    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : typeof input === "object" &&
                input !== null &&
                "url" in input &&
                typeof (input as { url?: unknown }).url === "string"
              ? (input as { url: string }).url
              : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const title = await screen.findByText("My saved draft title");
    const card = title.closest('[role="button"]');
    expect(card).not.toBeNull();
    expect(card).not.toHaveTextContent("Aug 14th, 2026");
    expect(screen.getByText("Draft description preview text")).toBeInTheDocument();
    const draftLabel = screen.getByText(/^Draft$/);
    const deleteButton = screen.getByLabelText("Delete draft");
    expect(screen.getAllByText(/^Draft$/)).toHaveLength(1);
    expect(deleteButton).toBeInTheDocument();
    expect(draftLabel).not.toHaveClass("absolute");
    expect(deleteButton).not.toHaveClass("absolute");
    expect(draftLabel.parentElement).toHaveClass("flex");
    const cardText = card?.textContent ?? "";
    expect(cardText.indexOf("My saved draft title")).toBeLessThan(
      cardText.indexOf("Draft description preview text"),
    );

    fireEvent.click(title);
    expect(screen.getByDisplayValue("My saved draft title")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Draft description preview text")).toBeInTheDocument();
    expect(screen.getAllByText(/^Draft$/)).toHaveLength(1);
  });

  it("reveals and hydrates description when clicking a saved history card", async () => {
    const historyDescription = "Hydrated description from history";
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : typeof input === "object" &&
                input !== null &&
                "url" in input &&
                typeof (input as { url?: unknown }).url === "string"
              ? (input as { url: string }).url
              : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [
            {
              id: "hist_1",
              createdAt: "2026-08-14T00:00:00.000Z",
              title: "History title one",
              description: historyDescription,
              targetTags: ["tag one"],
              discoveryTags: ["tag two"],
            },
          ],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(
      screen.queryByPlaceholderText("Add more details about your product to get more accurate tags..."),
    ).not.toBeInTheDocument();

    fireEvent.click(await screen.findByText("History title one"));

    expect(
      await screen.findByPlaceholderText("Add more details about your product to get more accurate tags..."),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue(historyDescription)).toBeInTheDocument();
  });

  it("shows all saved history tags immediately when clicking a saved history card", async () => {
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : typeof input === "object" &&
                input !== null &&
                "url" in input &&
                typeof (input as { url?: unknown }).url === "string"
              ? (input as { url: string }).url
              : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [
            {
              id: "hist_1",
              createdAt: "2026-08-14T00:00:00.000Z",
              title: "History title one",
              description: "Hydrated description from history",
              targetTags: ["tag one", "tag two", "tag one"],
              discoveryTags: ["tag three", "  ", "tag four"],
            },
          ],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.click(await screen.findByText("History title one"));

    const chips = screen.getAllByTestId("generated-tag-chip");
    expect(chips.map((chip) => chip.textContent)).toEqual([
      "tag one",
      "tag two",
      "tag three",
      "tag four",
    ]);
    expect(
      chips.every((chip) => chip.getAttribute("data-animation") === "none"),
    ).toBe(true);
  });

  it("clears pending history tags when switching to a draft card", async () => {
    window.localStorage.setItem(
      "tagloom:history:v1",
      JSON.stringify({
        page0: [
          {
            id: "hist_1",
            createdAt: "2026-08-14T00:00:00.000Z",
            title: "History title one",
            description: "Hydrated description from history",
            targetTags: ["tag one", "tag two", "tag three"],
            discoveryTags: ["tag four", "tag five", "tag six"],
          },
        ],
        hasPrev: false,
        hasNext: false,
        selectedId: null,
        draft: {
          title: "Draft listing",
          description: "Draft description",
          updatedAt: "2026-08-14T00:00:00.000Z",
        },
        savedAt: Date.now(),
      }),
    );

    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [
            {
              id: "hist_1",
              createdAt: "2026-08-14T00:00:00.000Z",
              title: "History title one",
              description: "Hydrated description from history",
              targetTags: ["tag one", "tag two", "tag three"],
              discoveryTags: ["tag four", "tag five", "tag six"],
            },
          ],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.click(await screen.findByText("History title one"));
    expect(await screen.findAllByTestId("generated-tag-chip")).toHaveLength(6);

    fireEvent.click(screen.getByText("Draft"));
    await waitFor(() => expect(screen.queryByTestId("generated-tag-chip")).not.toBeInTheDocument());
    expect(screen.getByDisplayValue("Draft description")).toBeInTheDocument();
  });

  it("creates a draft from typing without auto-selecting it when another history item is selected", async () => {
    window.localStorage.setItem(
      "tagloom:history:v1",
      JSON.stringify({
        page0: [],
        hasPrev: false,
        hasNext: false,
        selectedId: null,
        draft: null,
        savedAt: Date.now(),
      }),
    );

    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [
            {
              id: "hist_1",
              createdAt: "2026-08-14T00:00:00.000Z",
              title: "History title one",
              description: "Hydrated description from history",
              targetTags: ["tag one"],
              discoveryTags: ["tag two"],
            },
          ],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const historyCard = await screen.findByText("History title one");
    fireEvent.click(historyCard);

    const titleInput = screen.getByDisplayValue("History title one");
    fireEvent.change(titleInput, { target: { value: "History title one updated" } });

    expect(await screen.findByText("History title one updated")).toBeInTheDocument();
    expect(screen.getByText("History title one updated")).toBeInTheDocument();
    expect(historyCard.closest('[role="button"]')).not.toHaveClass(
      "border-orange-400",
    );
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("creates a new draft and selects it when nothing is selected", async () => {
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const titleInput = screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER);
    fireEvent.focus(titleInput);
    fireEvent.change(titleInput, { target: { value: "New draft title" } });

    expect(await screen.findByText("New draft title")).toBeInTheDocument();
    expect(screen.getByText("New draft title").closest('[role="button"]')).toHaveClass(
      "border-orange-400",
    );
  });
});
