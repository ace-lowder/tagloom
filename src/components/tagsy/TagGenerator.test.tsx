import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/toasts/ToastProvider";
import TagGenerator from "./TagGenerator";

function renderWithToasts(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

vi.mock("framer-motion", async () => {
  const ReactModule = await import("react");
  const stripMotionProps = (props: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => {
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

  const MotionDiv = ReactModule.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => (
      <div ref={ref} {...stripMotionProps(props)}>
        {children}
      </div>
    ),
  );
  const MotionSpan = ReactModule.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
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

    renderWithToasts(
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

    renderWithToasts(
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

    renderWithToasts(
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

    renderWithToasts(
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

    renderWithToasts(
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

    renderWithToasts(
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
    renderWithToasts(
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

    renderWithToasts(
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

    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

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

    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

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

    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

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

describe("TagGenerator CTA event", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("expands description and schedules a final centered scroll correction", async () => {
    vi.useFakeTimers();
    const fetchMock = createFetchMockForGenerator();
    vi.stubGlobal("fetch", fetchMock);
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("tagloom:generator-cta"));
    });

    expect(screen.getByText("Listing Description")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(380);
    });

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });

    vi.useRealTimers();
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

    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

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

    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole("button", { name: "Usage info" })).not.toBeInTheDocument();
    expect(screen.queryByText(/generations remaining/i)).not.toBeInTheDocument();
  });
});

describe("TagGenerator generation history mode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const historyItem = (overrides: Partial<{
    id: string;
    createdAt: string;
    title: string;
    description: string;
    targetTags: string[];
    discoveryTags: string[];
    archivedAt: string | null;
  }> = {}) => ({
    id: "hist_1",
    createdAt: "2026-05-08T12:00:00.000Z",
    title: "History title one",
    description: "Hydrated description from history",
    targetTags: ["tag one"],
    discoveryTags: ["tag two"],
    archivedAt: null,
    ...overrides,
  });

  const mockHistoryFetch = (
    items: Array<ReturnType<typeof historyItem>>,
    options: { patchOk?: boolean } = {},
  ) => {
    const fetchMock = vi.fn().mockImplementation((input: unknown, init?: RequestInit) => {
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
      if (url.includes("/api/generations/history") && init?.method === "PATCH") {
        const body =
          typeof init.body === "string"
            ? (JSON.parse(init.body) as { action?: string })
            : { action: "archive" };
        return mockGenerateResponse(
          {
            ok: true,
            archivedAt:
              body.action === "restore"
                ? null
                : "2026-05-08T13:00:00.000Z",
          },
          options.patchOk ?? true,
        );
      }
      if (url.includes("/api/generations/history")) {
        const includeArchived = url.includes("includeArchived=true");
        return mockGenerateResponse({
          items: includeArchived ? items : items.filter((item) => !item.archivedAt),
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

  const openHistory = async () => {
    const button = await screen.findByRole("button", {
      name: "Show generation history",
    });
    fireEvent.click(button);
  };

  it("hides the history switch in demo mode and shows it after user interaction with authenticated history", async () => {
    mockHistoryFetch([historyItem()]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(
      screen.queryByRole("button", { name: "Show generation history" }),
    ).not.toBeInTheDocument();
    const titleInput = screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER);
    fireEvent.focus(titleInput);

    expect(
      await screen.findByRole("button", { name: "Show generation history" }),
    ).toBeInTheDocument();
  });

  it("switches to the history viewer and back without clearing generator state", async () => {
    mockHistoryFetch([historyItem()]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const titleInput = screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER);
    fireEvent.focus(titleInput);
    fireEvent.change(titleInput, { target: { value: "Draft title" } });

    await openHistory();
    expect(screen.getByText("Generation History")).toBeInTheDocument();
    expect(screen.getByTestId("generation-history-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show generator" }));
    expect(screen.getByDisplayValue("Draft title")).toBeInTheDocument();
    expect(
      screen.getByTestId("generator-shell").querySelector(
        '[data-skip-generator-return-animations="true"]',
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByTestId("generator-shell")
        .querySelector('[data-description-animation="none"]'),
    ).toBeTruthy();
  });

  it("animates description reveal only on first focus after load", async () => {
    mockHistoryFetch([historyItem()]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const titleInput = screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER);
    fireEvent.focus(titleInput);
    const descriptionBlock = await screen.findByText("Listing Description");
    expect(descriptionBlock.closest('[data-description-animation="enter"]')).toBeTruthy();

    await openHistory();
    fireEvent.click(screen.getByRole("button", { name: "Show generator" }));
    expect(
      screen
        .getByTestId("generator-shell")
        .querySelector('[data-description-animation="none"]'),
    ).toBeTruthy();
  });

  it("renders the mode switch as an icon toggle with accessible labels and pressed state", async () => {
    mockHistoryFetch([historyItem()]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));

    const toggleToHistory = await screen.findByRole("button", {
      name: "Show generation history",
    });
    expect(toggleToHistory).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggleToHistory);
    const toggleToGenerator = screen.getByRole("button", {
      name: "Show generator",
    });
    expect(toggleToGenerator).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggleToGenerator);
    expect(
      screen.getByRole("button", { name: "Show generation history" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("locks shell height in history mode and releases it when returning to generator", async () => {
    mockHistoryFetch([historyItem()]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));
    expect(screen.getByTestId("generator-scroll-panel")).toHaveClass(
      "pr-2",
    );
    expect(screen.getByTestId("generator-scroll-panel")).not.toHaveClass(
      "overflow-y-auto",
    );
    expect(screen.getByTestId("generator-scroll-panel").firstElementChild).toHaveClass(
      "px-1",
      "pb-1",
    );
    const shell = screen.getByTestId("generator-shell");
    expect(shell).toHaveAttribute("data-history-height-locked", "false");

    await openHistory();
    expect(shell).toHaveAttribute("data-history-height-locked", "true");
    expect(screen.getByTestId("generation-history-panel").parentElement).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-hidden",
    );

    fireEvent.click(screen.getByRole("button", { name: "Show generator" }));
    expect(shell).toHaveAttribute("data-history-height-locked", "false");
  });

  it("ignores cached history mode and always hydrates in generator mode", async () => {
    window.localStorage.setItem(
      "tagloom:history:v2",
      JSON.stringify({
        activeGeneratedItems: [historyItem()],
        selectedGeneratedId: "hist_1",
        drafts: [],
        selectedDraftId: null,
        mode: "history",
        sortState: { key: "title", direction: "asc" },
        showArchived: true,
        savedAt: Date.now(),
      }),
    );
    mockHistoryFetch([historyItem()]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(screen.getByText("Tagloom Generator")).toBeInTheDocument();
    expect(screen.queryByText("Generation History")).not.toBeInTheDocument();
  });

  it("renders the empty history state when no drafts or generated rows exist", async () => {
    mockHistoryFetch([]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));
    await openHistory();

    expect(screen.getByText("No generation history")).toBeInTheDocument();
    expect(
      screen.getByText("Generate tags and view your past generations here."),
    ).toBeInTheDocument();
  });

  it("displays generated rows with date, title, description, and status", async () => {
    mockHistoryFetch([
      historyItem({
        title: "Sterling silver hoop earrings",
        description: "Lightweight hoops with a polished minimalist finish",
      }),
    ]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));
    await openHistory();

    expect(screen.getByText("May 8, 2026")).toBeInTheDocument();
    expect(screen.getByText("Sterling silver hoop earrings")).toBeInTheDocument();
    expect(screen.getByText("Lightweight hoops with a polished minimalist finish")).toBeInTheDocument();
    expect(screen.getByText("generated")).toBeInTheDocument();
  });

  it("selects a generated row, loads tags, shows toast, and stays in history mode", async () => {
    mockHistoryFetch([historyItem({ targetTags: ["tag one", "tag one"], discoveryTags: ["tag two"] })]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));
    await openHistory();
    fireEvent.click(screen.getByText("History title one"));

    expect(screen.getByText("Generation History")).toBeInTheDocument();
    expect(await screen.findByText("Generation loaded")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show generator" }));
    expect(screen.getByDisplayValue("History title one")).toBeInTheDocument();
    expect(
      screen
        .getByTestId("generator-shell")
        .querySelector('[data-description-animation="none"]'),
    ).toBeTruthy();
    expect(screen.getAllByTestId("generated-tag-chip").map((chip) => chip.textContent)).toEqual([
      "tag one",
      "tag two",
    ]);
    expect(screen.getByTestId("results-block")).toHaveAttribute(
      "data-results-animation",
      "none",
    );
    expect(
      screen
        .getAllByTestId("generated-tag-chip")
        .every((chip) => chip.getAttribute("data-animation") === "none"),
    ).toBe(true);
  });

  it("keeps description hidden on cached draft hydration until first focus, then animates reveal", async () => {
    window.localStorage.setItem(
      "tagloom:history:v2",
      JSON.stringify({
        generatedItems: [],
        selectedGeneratedId: null,
        drafts: [
          {
            id: "draft_1",
            title: "Hydrated draft",
            description: "Hydrated description",
            updatedAt: "2026-05-08T12:30:00.000Z",
          },
        ],
        selectedDraftId: "draft_1",
        mode: "generator",
        sortState: null,
        showArchived: false,
        savedAt: Date.now(),
      }),
    );
    mockHistoryFetch([historyItem()]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(screen.queryByText("Listing Description")).not.toBeInTheDocument();
    const titleInput = screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER);
    fireEvent.focus(titleInput);
    const descriptionBlock = await screen.findByText("Listing Description");
    expect(descriptionBlock.closest('[data-description-animation="enter"]')).toBeTruthy();
    expect(
      screen
        .getByTestId("generator-shell")
        .querySelector('[data-description-animation="enter"]'),
    ).toBeTruthy();
  });

  it("selects a draft row and loads it", async () => {
    mockHistoryFetch([]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const titleInput = screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER);
    fireEvent.focus(titleInput);
    await screen.findByRole("button", { name: "Show generation history" });
    fireEvent.change(titleInput, { target: { value: "Draft listing" } });
    await openHistory();
    fireEvent.click(screen.getByText("Draft listing"));
    fireEvent.click(screen.getByRole("button", { name: "Show generator" }));

    expect(screen.getByDisplayValue("Draft listing")).toBeInTheDocument();
  });

  it("requires confirmation before deleting a selected draft and clears selection", async () => {
    mockHistoryFetch([historyItem()]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    const titleInput = screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER);
    fireEvent.focus(titleInput);
    await screen.findByRole("button", { name: "Show generation history" });
    fireEvent.change(titleInput, { target: { value: "Draft to delete" } });
    await openHistory();
    fireEvent.click(screen.getByLabelText("Delete draft"));

    expect(screen.getByText("Delete draft?")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Delete draft" })[1]);
    await waitFor(() => expect(screen.queryByText("Draft to delete")).not.toBeInTheDocument());
    expect(screen.getByText("History title one").closest('[role="button"]')).not.toHaveClass("bg-orange-50");

    fireEvent.click(screen.getByRole("button", { name: "Show generator" }));
    expect(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER)).toHaveValue("");
  });

  it("requires confirmation before archiving a generated row and hides it from default history", async () => {
    const fetchMock = mockHistoryFetch([historyItem()]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));
    await openHistory();
    fireEvent.click(screen.getByLabelText("Archive generation"));

    expect(screen.getByText("Archive generation?")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Archive generation" })[1]);

    await waitFor(() => expect(screen.queryByText("History title one")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generations/history",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ generationId: "hist_1", action: "archive" }),
      }),
    );
  });

  it("renders restore action for archived rows and restores via confirmation without refetch", async () => {
    const fetchMock = mockHistoryFetch([
      historyItem({
        id: "hist_archived",
        title: "Archived title",
        archivedAt: "2026-05-08T13:00:00.000Z",
      }),
    ]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));
    await openHistory();

    const statusHeader = screen.getByRole("button", { name: /^Status/i });
    fireEvent.click(statusHeader);
    fireEvent.click(statusHeader);
    fireEvent.click(statusHeader);

    const historyGetCallsBefore = fetchMock.mock.calls.filter(([input, init]) => {
      const url = typeof input === "string" ? input : String(input);
      return url.includes("/api/generations/history") && (!init || init.method === "GET");
    }).length;

    fireEvent.click(await screen.findByLabelText("Restore generation"));
    expect(screen.getByText("Restore generation?")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Restore generation" })[1]);

    await waitFor(() => expect(screen.queryByText("archived")).not.toBeInTheDocument());
    expect(screen.getByText("generated")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generations/history",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ generationId: "hist_archived", action: "restore" }),
      }),
    );

    const historyGetCallsAfter = fetchMock.mock.calls.filter(([input, init]) => {
      const url = typeof input === "string" ? input : String(input);
      return url.includes("/api/generations/history") && (!init || init.method === "GET");
    }).length;
    expect(historyGetCallsAfter).toBe(historyGetCallsBefore);
  });

  it("cancels restore without sending PATCH", async () => {
    const fetchMock = mockHistoryFetch([
      historyItem({
        id: "hist_archived",
        title: "Archived title",
        archivedAt: "2026-05-08T13:00:00.000Z",
      }),
    ]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));
    await openHistory();
    const statusHeader = screen.getByRole("button", { name: /^Status/i });
    fireEvent.click(statusHeader);
    fireEvent.click(statusHeader);
    fireEvent.click(statusHeader);

    fireEvent.click(await screen.findByLabelText("Restore generation"));
    expect(screen.getByText("Restore generation?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      fetchMock.mock.calls.some(([input, init]) => {
        const url = typeof input === "string" ? input : String(input);
        return (
          url.includes("/api/generations/history") &&
          Boolean(init) &&
          init?.method === "PATCH"
        );
      }),
    ).toBe(false);
  });

  it("status header third click includes archived rows without refetch", async () => {
    const fetchMock = mockHistoryFetch([historyItem({ archivedAt: "2026-05-08T13:00:00.000Z", title: "Archived title" })]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));
    await openHistory();
    expect(screen.queryByText("Archived title")).not.toBeInTheDocument();
    const historyGetCallsBefore = fetchMock.mock.calls.filter(([input, init]) => {
      const url = typeof input === "string" ? input : String(input);
      return url.includes("/api/generations/history") && (!init || init.method === "GET");
    }).length;

    const statusHeader = screen.getByRole("button", { name: /^Status/i });
    expect(statusHeader).toHaveClass("col-span-2");
    fireEvent.click(statusHeader);
    fireEvent.click(statusHeader);
    fireEvent.click(statusHeader);

    expect(await screen.findByText("Archived title")).toBeInTheDocument();
    expect(screen.getByText("archived")).toBeInTheDocument();
    const historyGetCallsAfter = fetchMock.mock.calls.filter(([input, init]) => {
      const url = typeof input === "string" ? input : String(input);
      return url.includes("/api/generations/history") && (!init || init.method === "GET");
    }).length;
    expect(historyGetCallsAfter).toBe(historyGetCallsBefore);
  });

  it("date header cycles desc, asc, then default", async () => {
    mockHistoryFetch([
      historyItem({ id: "hist_old", title: "Old", createdAt: "2026-05-07T12:00:00.000Z" }),
      historyItem({ id: "hist_new", title: "New", createdAt: "2026-05-08T12:00:00.000Z" }),
    ]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));
    await openHistory();
    const dateHeader = screen.getByRole("button", { name: /^Date/i });

    fireEvent.click(dateHeader);
    expect(screen.getAllByText(/^(Old|New)$/).map((node) => node.textContent)).toEqual([
      "New",
      "Old",
    ]);

    fireEvent.click(dateHeader);
    expect(screen.getAllByText(/^(Old|New)$/).map((node) => node.textContent)).toEqual([
      "Old",
      "New",
    ]);

    fireEvent.click(dateHeader);
    expect(screen.getAllByText(/^(Old|New)$/).map((node) => node.textContent)).toEqual([
      "New",
      "Old",
    ]);
  });

  it("sort headers cycle through asc, desc, and default for text columns", async () => {
    mockHistoryFetch([
      historyItem({ id: "hist_b", title: "B title", createdAt: "2026-05-07T12:00:00.000Z" }),
      historyItem({ id: "hist_a", title: "A title", createdAt: "2026-05-08T12:00:00.000Z" }),
    ]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));
    await openHistory();
    const titleHeader = screen.getByRole("button", { name: /^Title/i });

    fireEvent.click(titleHeader);
    expect(screen.getAllByText(/ title$/).map((node) => node.textContent)).toEqual([
      "A title",
      "B title",
    ]);

    fireEvent.click(titleHeader);
    expect(screen.getAllByText(/ title$/).map((node) => node.textContent)).toEqual([
      "B title",
      "A title",
    ]);

    fireEvent.click(titleHeader);
    expect(screen.getAllByText(/ title$/).map((node) => node.textContent)).toEqual([
      "A title",
      "B title",
    ]);
  });

  it("initial history fetch includes archived rows", async () => {
    const fetchMock = mockHistoryFetch([historyItem()]);
    renderWithToasts(<TagGenerator demoConfig={{ timings: TEST_TIMINGS }} />);
    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));

    await screen.findByRole("button", { name: "Show generation history" });
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("includeArchived=true"),
        expect.objectContaining({ method: "GET" }),
      ),
    );
  });
});
