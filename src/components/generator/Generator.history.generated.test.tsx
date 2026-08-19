import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TITLE_PLACEHOLDER,
  mockGenerateResponse,
  renderWithToasts,
  resetGeneratorTestStorage,
  TEST_TIMINGS,
} from "./Generator.testUtils";
import Generator from "./Generator";

beforeEach(() => {
  resetGeneratorTestStorage();
});

describe("Generator generation history mode", () => {
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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));
    expect(screen.getByTestId("generator-scroll-panel")).toHaveClass(
      "overflow-visible",
    );
    expect(screen.getByTestId("generator-scroll-panel")).not.toHaveClass("pr-2");
    expect(screen.getByTestId("generator-scroll-panel")).not.toHaveClass(
      "overflow-y-auto",
    );
    expect(screen.getByTestId("title-focus-gutter")).toHaveClass("-mx-1", "px-1", "pb-1");
    expect(screen.getByTestId("description-focus-gutter")).toHaveClass(
      "-mx-1",
      "px-1",
      "pb-1",
    );
    const shell = screen.getByTestId("generator-shell");
    expect(shell).toHaveClass("overflow-visible");
    expect(shell).not.toHaveClass("overflow-hidden");
    expect(shell).toHaveAttribute("data-history-height-locked", "false");

    await openHistory();
    expect(shell).toHaveClass("overflow-hidden");
    expect(shell).toHaveAttribute("data-history-height-locked", "true");
    expect(screen.getByTestId("generation-history-panel").parentElement).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-hidden",
    );

    fireEvent.click(screen.getByRole("button", { name: "Show generator" }));
    expect(shell).toHaveClass("overflow-visible");
    expect(shell).toHaveAttribute("data-history-height-locked", "false");
  });


  it("ignores cached history mode and always hydrates in generator mode", async () => {
    window.localStorage.setItem(
      "updatetags:history:v2",
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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(screen.getByText("Tag Generator")).toBeInTheDocument();
    expect(screen.queryByText("Generation History")).not.toBeInTheDocument();
  });


  it("renders the empty history state when no drafts or generated rows exist", async () => {
    mockHistoryFetch([]);
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.focus(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER));
    await openHistory();

    expect(screen.getByText("May 8, 2026")).toBeInTheDocument();
    expect(screen.getByText("Sterling silver hoop earrings")).toBeInTheDocument();
    expect(screen.getByText("Lightweight hoops with a polished minimalist finish")).toBeInTheDocument();
    expect(screen.getByText("generated")).toBeInTheDocument();
  });


  it("selects a generated row, loads tags, shows toast, and stays in history mode", async () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      });
    const cancelRafSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => undefined);

    mockHistoryFetch([historyItem({ targetTags: ["tag one", "tag one"], discoveryTags: ["tag two"] })]);
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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

    expect(rafCallbacks.length).toBeGreaterThanOrEqual(1);
    await act(async () => {
      const callback = rafCallbacks.shift();
      callback?.(0);
    });
    expect(screen.getByTestId("results-block")).toHaveAttribute(
      "data-results-animation",
      "none",
    );
    expect(
      screen
        .getAllByTestId("generated-tag-chip")
        .every((chip) => chip.getAttribute("data-animation") === "none"),
    ).toBe(true);

    await act(async () => {
      const callback = rafCallbacks.shift();
      callback?.(16);
    });

    rafSpy.mockRestore();
    cancelRafSpy.mockRestore();
  });
});
