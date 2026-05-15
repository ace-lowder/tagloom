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


  it("requires confirmation before archiving a generated row and hides it from default history", async () => {
    const fetchMock = mockHistoryFetch([historyItem()]);
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);
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
