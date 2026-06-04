import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFetchMockForGenerator,
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

describe("Generator generation feedback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function setupFeedbackFetch() {
    const historyItems = [
      {
        id: "11111111-1111-1111-1111-111111111111",
        createdAt: "2026-05-08T12:00:00.000Z",
        title: "Saved row",
        description: "Saved description",
        targetTags: ["saved one"],
        discoveryTags: ["saved two"],
        feedback: { rating: "down", note: "not relevant" },
      },
    ];

    return vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }
      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: historyItems,
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }
      if (url.includes("/api/generate")) {
        return mockGenerateResponse({
          status: "ok",
          requestId: "ctx_1",
          generationId: "22222222-2222-2222-2222-222222222222",
          tags: { target: ["one", "two"], discovery: ["three"] },
          source: "model",
          entitlementUsed: "free_credit",
        });
      }
      if (url.includes("/api/feedback/generation")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          action?: string;
          rating?: "up" | "down";
          note?: string;
        };
        if (body.action === "clear") return mockGenerateResponse({ feedback: null });
        return mockGenerateResponse({
          feedback: {
            rating: body.rating,
            note: body.rating === "up" ? null : body.note ?? null,
          },
        });
      }
      return mockGenerateResponse({ error: "Unexpected fetch call." }, false);
    });
  }

  it("shows feedback controls only for logged-in persisted generated rows", async () => {
    const fetchMock = setupFeedbackFetch();
    vi.stubGlobal("fetch", fetchMock);

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    expect(screen.queryByLabelText("Thumbs up")).not.toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER);
    fireEvent.change(titleInput, { target: { value: "Generated listing title" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate tags" }));

    await waitFor(() => expect(screen.getByLabelText("Thumbs up")).toBeInTheDocument());
    expect(screen.getByLabelText("Thumbs down")).toBeInTheDocument();
    expect(screen.queryByText("Was this generation helpful?")).not.toBeInTheDocument();
  });

  it("shows loading state immediately when generate is clicked", async () => {
    const deferredGenerate = new Promise<Response>((resolve) => {
      setTimeout(() => {
        resolve({
          ok: true,
          json: async () => ({
            status: "ok",
            requestId: "ctx_2",
            generationId: "33333333-3333-3333-3333-333333333333",
            tags: { target: ["one"], discovery: [] },
            source: "model",
            entitlementUsed: "free_credit",
          }),
        } as Response);
      }, 50);
    });
    const fetchMock = createFetchMockForGenerator(deferredGenerate);
    vi.stubGlobal("fetch", fetchMock);

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);
    fireEvent.change(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER), {
      target: { value: "Generated listing title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate tags" }));

    expect(screen.getByRole("button", { name: "Generating tags" })).toBeDisabled();
    await screen.findByLabelText("Thumbs up");
  });

  it("saves and clears thumbs up", async () => {
    const fetchMock = setupFeedbackFetch();
    vi.stubGlobal("fetch", fetchMock);

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);
    fireEvent.change(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER), {
      target: { value: "Generated listing title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate tags" }));

    const upButton = await screen.findByLabelText("Thumbs up");
    fireEvent.click(upButton);
    await waitFor(() => expect(upButton).toHaveAttribute("aria-pressed", "true"));

    fireEvent.click(upButton);
    await waitFor(() => expect(upButton).toHaveAttribute("aria-pressed", "false"));
  });

  it("opens downvote modal and saves note", async () => {
    const fetchMock = setupFeedbackFetch();
    vi.stubGlobal("fetch", fetchMock);

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);
    fireEvent.change(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER), {
      target: { value: "Generated listing title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate tags" }));

    const downButton = await screen.findByLabelText("Thumbs down");
    fireEvent.click(downButton);

    await screen.findByText("What went wrong with these tags?");
    fireEvent.change(
      screen.getByPlaceholderText(
        "Please tell us what went wrong with these tags so we can improve future tags.",
      ),
      {
      target: { value: "Too broad for my listing" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(downButton).toHaveAttribute("aria-pressed", "true"));
  });

  it("closing downvote modal after previous up submits down with empty note", async () => {
    const fetchMock = setupFeedbackFetch();
    vi.stubGlobal("fetch", fetchMock);

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);
    fireEvent.change(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER), {
      target: { value: "Generated listing title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate tags" }));

    const upButton = await screen.findByLabelText("Thumbs up");
    const downButton = screen.getByLabelText("Thumbs down");
    fireEvent.click(upButton);
    await waitFor(() => expect(upButton).toHaveAttribute("aria-pressed", "true"));

    fireEvent.click(downButton);
    await screen.findByText("What went wrong with these tags?");
    fireEvent.click(screen.getByRole("button", { name: "Close feedback modal" }));

    await waitFor(() => expect(downButton).toHaveAttribute("aria-pressed", "true"));
    expect(upButton).toHaveAttribute("aria-pressed", "false");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/feedback/generation",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"note":""'),
      }),
    );
  });

  it("restores saved feedback from selected history row", async () => {
    const fetchMock = setupFeedbackFetch();
    vi.stubGlobal("fetch", fetchMock);

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.change(screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER), {
      target: { value: "stop demo" },
    });

    const historyToggle = await screen.findByRole("button", {
      name: "Show generation history",
    });
    fireEvent.click(historyToggle);

    await screen.findByText("Saved row");
    fireEvent.click(screen.getByText("Saved row"));
    fireEvent.click(screen.getByRole("button", { name: "Show generator" }));

    const downButton = await screen.findByLabelText("Thumbs down");
    await waitFor(() => expect(downButton).toHaveAttribute("aria-pressed", "true"));
  });
});
