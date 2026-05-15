import React from "react";
import { act, render } from "@testing-library/react";
import { vi } from "vitest";
import { ToastProvider } from "@/components/toasts/ToastProvider";

export function renderWithToasts(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

vi.mock("framer-motion", async () => {
  const ReactModule = await import("react");
  const stripMotionProps = (
    props: React.HTMLAttributes<HTMLElement> & Record<string, unknown>,
  ) => {
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

  const MotionDiv = ReactModule.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
  >(({ children, ...props }, ref) => (
    <div ref={ref} {...stripMotionProps(props)}>
      {children}
    </div>
  ));

  const MotionSpan = ReactModule.forwardRef<
    HTMLSpanElement,
    React.HTMLAttributes<HTMLSpanElement>
  >(({ children, ...props }, ref) => (
    <span ref={ref} {...stripMotionProps(props)}>
      {children}
    </span>
  ));

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

export const TEST_TIMINGS = {
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

export const CLEAR_TEST_TIMINGS = {
  ...TEST_TIMINGS,
  showDwellMs: 10,
  clearFadeMs: 80,
  clearCollapseMs: 80,
};

export const DEFAULT_TITLE_PLACEHOLDER =
  "e.g. Handmade ceramic coffee mug with minimalist design";

export function sanitizeExpectedTags(target: string[], discovery: string[]) {
  const seen = new Set<string>();
  return [...target, ...discovery].reduce<string[]>((cleaned, rawTag) => {
    const tag = rawTag.trim();
    if (!tag || seen.has(tag)) return cleaned;
    seen.add(tag);
    cleaned.push(tag);
    return cleaned;
  }, []);
}

export function mockGenerateResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: async () => body,
  } as Response);
}

export function createFetchMockForGenerator(
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

export function countGenerateCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([input]) => {
    const url = typeof input === "string" ? input : String(input);
    return url.includes("/api/generate");
  }).length;
}

export async function advanceToReveal(title: string, tagCount: number) {
  const ms = 1 + title.length * 1 + 1 + 1 + tagCount * 1 + 40;
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

export function resetGeneratorTestStorage() {
  window.localStorage.clear();
  window.sessionStorage.clear();
}
