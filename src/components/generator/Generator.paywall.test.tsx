import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countGenerateCalls,
  createFetchMockForGenerator,
  mockGenerateResponse,
  renderWithToasts,
  resetGeneratorTestStorage,
  TEST_TIMINGS,
} from "./Generator.testUtils";
import Generator from "./Generator";

beforeEach(() => {
  resetGeneratorTestStorage();
});

describe("Generator auth unlock flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("restores the unlock-ready state even when no placeholder tags were shown", async () => {
    const fetchMock = createFetchMockForGenerator(
      () =>
        mockGenerateResponse({
          status: "paywall",
          reason: "auth_required",
          requestId: "ctx-empty",
          message: "Create account or login.",
          placeholders: { target: [], discovery: [] },
        }),
      () =>
        mockGenerateResponse({
          status: "ok",
          requestId: "ctx-empty",
          tags: { target: ["handmade gift"], discovery: [] },
          source: "model",
          entitlementUsed: "free_credit",
          generationId: "gen-empty",
        }),
    );

    vi.stubGlobal("fetch", fetchMock);

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    const titleInput = screen.getByPlaceholderText(
      "e.g. Handmade ceramic coffee mug with minimalist design",
    );
    fireEvent.change(titleInput, {
      target: {
        value: "Personalized Dad V-Neck T-Shirt - 100% Cotton Custom Name Shirt",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate tags" }));

    await screen.findByText("Create an account or log in to unlock this generation for FREE");

    act(() => {
      window.dispatchEvent(new CustomEvent("tagloom:auth-success"));
    });

    await screen.findByText("Your listing is ready. Review it, then use your free generation.");
    fireEvent.click(screen.getByRole("button", { name: "Use my free generation" }));
    await screen.findByText(
      "You are about to use your one free generation. Would you like to use that now?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => expect(screen.getByText("handmade gift")).toBeInTheDocument());
    expect(countGenerateCalls(fetchMock)).toBe(2);
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

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    const titleInput = screen.getByPlaceholderText(
      "e.g. Handmade ceramic coffee mug with minimalist design",
    );
    fireEvent.change(titleInput, {
      target: {
        value: "Personalized Dad V-Neck T-Shirt - 100% Cotton Custom Name Shirt",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate tags" }));

    await screen.findByText("Create an account or log in to unlock this generation for FREE");
    await screen.findByText("hidden keyword");
    expect(screen.getAllByTestId("generated-tag-chip").length).toBeGreaterThan(0);

    act(() => {
      window.dispatchEvent(new CustomEvent("tagloom:auth-success"));
    });

    await waitFor(() =>
      expect(screen.queryByText("Create an account or log in to unlock this generation for FREE")).not.toBeInTheDocument(),
    );
    await screen.findByText("Your listing is ready. Review it, then use your free generation.");
    expect(screen.getByText("hidden keyword")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use my free generation" }));
    await screen.findByText(
      "You are about to use your one free generation. Would you like to use that now?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => expect(screen.getByText(realTags[0])).toBeInTheDocument());
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

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    const titleInput = screen.getByPlaceholderText(
      "e.g. Handmade ceramic coffee mug with minimalist design",
    );
    fireEvent.change(titleInput, {
      target: {
        value: "Personalized Dad V-Neck T-Shirt - 100% Cotton Custom Name Shirt",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate tags" }));

    await screen.findByText("Create an account or log in to unlock this generation for FREE");
    expect(screen.getByText("hidden keyword")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent("tagloom:auth-success"));
    });

    await screen.findByText("Your listing is ready. Review it, then use your free generation.");
    fireEvent.click(screen.getByRole("button", { name: "Use my free generation" }));
    await screen.findByText(
      "You are about to use your one free generation. Would you like to use that now?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    await screen.findByText("Could not generate tags.");
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

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    const titleInput = screen.getByPlaceholderText(
      "e.g. Handmade ceramic coffee mug with minimalist design",
    );
    fireEvent.change(titleInput, { target: { value: "Custom Dad Shirt Gift" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate tags" }));

    await screen.findByText("You have no remaining generation credits.");

    act(() => {
      window.dispatchEvent(new CustomEvent("tagloom:auth-success"));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(countGenerateCalls(fetchMock)).toBe(1);
  });

  it("uses unlock-ready primary action and unlocks without re-opening auth", async () => {
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
      "boho wedding jewelry",
      "bridal gold necklace",
      "dainty pearl necklace",
      "minimalist bridal gift",
      "bridesmaid jewelry set",
      "wedding day necklace",
      "layering gold chain",
      "gift for bride",
      "delicate pearl charm",
      "handmade wedding gift",
      "bride shower gift",
      "elegant bridal style",
      "timeless wedding look",
    ];

    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url = typeof input === "string" ? input : String(input);

      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: "2 generations left" });
      }

      if (url.includes("/api/generations/history")) {
        return mockGenerateResponse({
          items: [],
          page: 0,
          hasPrev: false,
          hasNext: false,
        });
      }

      const generateCalls = fetchMock.mock.calls.filter(([callInput]) =>
        String(callInput).includes("/api/generate"),
      ).length;

      if (generateCalls === 1) {
        return mockGenerateResponse({
          status: "paywall",
          reason: "auth_required",
          requestId: "ctx-auth-manual",
          message: "Create account or login.",
          placeholders: { target: placeholders, discovery: [] },
        });
      }

      return mockGenerateResponse({
        status: "ok",
        requestId: "ctx-auth-manual",
        generationId: "gen-unlocked-1",
        tags: { target: realTags, discovery: [] },
        source: "model",
        entitlementUsed: "free_credit",
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.change(
      screen.getByPlaceholderText("e.g. Handmade ceramic coffee mug with minimalist design"),
      {
        target: {
          value: "Bridal pearl necklace, dainty gold chain, gift for bride wedding day",
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate tags" }));

    await screen.findByText("Create an account or log in to unlock this generation for FREE");
    act(() => {
      window.dispatchEvent(new CustomEvent("tagloom:auth-success"));
    });

    const unlockButton = await screen.findByRole("button", {
      name: "Use my free generation",
    });
    expect(
      screen.queryByRole("button", { name: "Create account / log in" }),
    ).not.toBeInTheDocument();

    fireEvent.click(unlockButton);
    await screen.findByText(
      "You are about to use your one free generation. Would you like to use that now?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => expect(screen.getByText(realTags[0])).toBeInTheDocument());
    expect(countGenerateCalls(fetchMock)).toBe(2);
  });
});
