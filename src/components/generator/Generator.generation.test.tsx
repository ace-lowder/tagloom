import { act, fireEvent, screen, waitFor } from "@testing-library/react";
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

describe("Generator CTA event", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("expands description and schedules a final centered scroll correction", async () => {
    vi.useFakeTimers();
    const fetchMock = createFetchMockForGenerator();
    vi.stubGlobal("fetch", fetchMock);
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("updatetags:generator-cta"));
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

describe("Generator usage label info", () => {
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

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole("button", { name: "Usage info" })).not.toBeInTheDocument();
    expect(screen.queryByText(/generations remaining/i)).not.toBeInTheDocument();
  });
});
