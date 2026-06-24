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
import { getContextStorageKey } from "./generatorStorage";

beforeEach(() => {
  resetGeneratorTestStorage();
});

describe("Generator auth unlock flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createAuthAwareFetchMock(
    ...generateResponses: Array<Promise<Response> | (() => Promise<Response>)>
  ) {
    let generateIndex = 0;
    let historyAuthenticated = false;

    return {
      fetchMock: vi.fn().mockImplementation((input: unknown) => {
        const url = typeof input === "string" ? input : String(input);

        if (url.includes("/api/account/usage")) {
          return mockGenerateResponse({ usageLabel: null });
        }

        if (url.includes("/api/generations/history")) {
          return historyAuthenticated
            ? mockGenerateResponse({
                items: [],
                page: 0,
                hasPrev: false,
                hasNext: false,
              })
            : mockGenerateResponse({
                status: "unauthenticated",
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
      }),
      setHistoryAuthenticated(value: boolean) {
        historyAuthenticated = value;
      },
    };
  }

  function getStoredGuestGenerationId() {
    const raw = window.localStorage.getItem("tagloom:guest-generation:v1");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { id?: string } | null;
      return typeof parsed?.id === "string" ? parsed.id : null;
    } catch {
      return null;
    }
  }

  it("restores the unlock-ready state even when no placeholder tags were shown", async () => {
    const { fetchMock, setHistoryAuthenticated } = createAuthAwareFetchMock(
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
    fireEvent.click(screen.getByRole("button", { name: "Create account / log in" }));
    const guestGenerationId = getStoredGuestGenerationId();
    expect(guestGenerationId).toBeTruthy();
    window.history.replaceState({}, "", `/?guest_generation=${guestGenerationId}`);

    act(() => {
      setHistoryAuthenticated(true);
      window.dispatchEvent(new CustomEvent("tagloom:auth-success"));
    });

    await screen.findByText("Your listing is ready. Review it, then use your free generation.");
    expect(screen.queryByTestId("generated-tag-count")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy all" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use my free generation" }));
    await screen.findByText(
      "You are about to use your one free generation. Would you like to use that now?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => expect(screen.getByText("handmade gift")).toBeInTheDocument());
    expect(countGenerateCalls(fetchMock)).toBe(2);
  });

  it("restores a verified guest generation after a fresh unmount and remount without replaying the paywall request", async () => {
    const { fetchMock, setHistoryAuthenticated } = createAuthAwareFetchMock(
      () =>
        mockGenerateResponse({
          status: "paywall",
          reason: "auth_required",
          requestId: "ctx-remount",
          message: "Create account or login.",
          placeholders: {
            target: ["hidden keyword", "trend phrase"],
            discovery: [],
          },
        }),
      () =>
        mockGenerateResponse({
          status: "ok",
          requestId: "ctx-remount",
          tags: { target: ["personalized dad shirt"], discovery: [] },
          source: "model",
          entitlementUsed: "free_credit",
          generationId: "gen-remount",
        }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const firstRender = renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

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
    const guestGenerationId = getStoredGuestGenerationId();
    expect(guestGenerationId).toBeTruthy();
    window.history.replaceState({}, "", `/?guest_generation=${guestGenerationId}`);
    expect(countGenerateCalls(fetchMock)).toBe(1);

    firstRender.unmount();
    act(() => {
      setHistoryAuthenticated(true);
      window.dispatchEvent(new CustomEvent("tagloom:auth-success"));
    });

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    await screen.findByText("Your listing is ready. Review it, then use your free generation.");
    expect(screen.queryByText("hidden keyword")).not.toBeInTheDocument();
    expect(screen.queryByTestId("generated-tag-count")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy all" })).not.toBeInTheDocument();
    expect(countGenerateCalls(fetchMock)).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Use my free generation" }));
    await screen.findByText(
      "You are about to use your one free generation. Would you like to use that now?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => expect(screen.getByText("personalized dad shirt")).toBeInTheDocument());
    expect(screen.getByTestId("generated-tag-count")).toHaveTextContent("1 tags generated");
    expect(screen.getByRole("button", { name: "Copy all" })).toBeEnabled();
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

    const { fetchMock, setHistoryAuthenticated } = createAuthAwareFetchMock(
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
    fireEvent.click(screen.getByRole("button", { name: "Create account / log in" }));
    const guestGenerationId = getStoredGuestGenerationId();
    expect(guestGenerationId).toBeTruthy();
    window.history.replaceState({}, "", `/?guest_generation=${guestGenerationId}`);

    act(() => {
      setHistoryAuthenticated(true);
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

    const { fetchMock, setHistoryAuthenticated } = createAuthAwareFetchMock(
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
    fireEvent.click(screen.getByRole("button", { name: "Create account / log in" }));
    const guestGenerationId = getStoredGuestGenerationId();
    expect(guestGenerationId).toBeTruthy();
    window.history.replaceState({}, "", `/?guest_generation=${guestGenerationId}`);

    act(() => {
      setHistoryAuthenticated(true);
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

    let historyAuthenticated = false;
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url = typeof input === "string" ? input : String(input);

      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: "2 generations left" });
      }

      if (url.includes("/api/generations/history")) {
        return historyAuthenticated
          ? mockGenerateResponse({
              items: [],
              page: 0,
              hasPrev: false,
              hasNext: false,
            })
          : mockGenerateResponse({
              status: "unauthenticated",
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
      historyAuthenticated = true;
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
    expect(window.localStorage.getItem("tagloom:guest-generation:v1")).toBeNull();
    expect(window.location.search).not.toContain("guest_generation");
  });

  it("does not restore from a stale session-context fallback", async () => {
    window.sessionStorage.setItem(
      getContextStorageKey("ctx-session"),
      JSON.stringify({
        id: "ctx-session",
        title: "Session title",
        description: "Session description",
      }),
    );

    let historyAuthenticated = false;
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url = typeof input === "string" ? input : String(input);

      if (url.includes("/api/account/usage")) {
        return mockGenerateResponse({ usageLabel: null });
      }

      if (url.includes("/api/generations/history")) {
        return historyAuthenticated
          ? mockGenerateResponse({
              items: [],
              page: 0,
              hasPrev: false,
              hasNext: false,
            })
          : mockGenerateResponse({
              status: "unauthenticated",
            });
      }

      const generateCalls = fetchMock.mock.calls.filter(([callInput]) =>
        String(callInput).includes("/api/generate"),
      ).length;

      if (generateCalls === 1) {
        return mockGenerateResponse({
          status: "paywall",
          reason: "auth_required",
          requestId: "ctx-session",
          message: "Create account or login.",
          placeholders: { target: ["hidden keyword"], discovery: [] },
        });
      }

      return mockGenerateResponse({
        error: "Unexpected fetch call.",
      }, false);
    });

    vi.stubGlobal("fetch", fetchMock);

    renderWithToasts(<Generator demoConfig={{ timings: TEST_TIMINGS }} />);

    fireEvent.change(
      screen.getByPlaceholderText("e.g. Handmade ceramic coffee mug with minimalist design"),
      {
        target: {
          value: "Custom pendant necklace gift",
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate tags" }));

    await screen.findByText("Create an account or log in to unlock this generation for FREE");
    fireEvent.click(screen.getByRole("button", { name: "Create account / log in" }));
    const guestGenerationId = getStoredGuestGenerationId();
    expect(guestGenerationId).toBeTruthy();
    window.history.replaceState({}, "", `/?guest_generation=${guestGenerationId}`);

    act(() => {
      historyAuthenticated = true;
      window.dispatchEvent(new CustomEvent("tagloom:auth-success"));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(screen.queryByText("Session title")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use my free generation" })).toBeInTheDocument();
    expect(countGenerateCalls(fetchMock)).toBe(1);
  });
});
