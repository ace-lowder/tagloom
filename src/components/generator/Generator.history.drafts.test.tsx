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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
});
