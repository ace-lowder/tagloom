import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dispatchGeneratorCta,
  GENERATOR_CTA_EVENT,
  GENERATOR_CTA_SCROLL_SETTLE_MS,
} from "@/lib/generatorCta";

describe("dispatchGeneratorCta", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("waits for smooth scroll to settle before dispatching the CTA event", () => {
    const generator = document.createElement("div");
    const scrollIntoView = vi.fn();
    generator.id = "generator";
    generator.scrollIntoView = scrollIntoView;
    document.body.appendChild(generator);
    const onCta = vi.fn();
    window.addEventListener(GENERATOR_CTA_EVENT, onCta);

    dispatchGeneratorCta({ requestReset: false }, { smoothScroll: true });

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
    expect(onCta).not.toHaveBeenCalled();

    vi.advanceTimersByTime(GENERATOR_CTA_SCROLL_SETTLE_MS - 1);
    expect(onCta).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onCta).toHaveBeenCalledTimes(1);

    window.removeEventListener(GENERATOR_CTA_EVENT, onCta);
  });
});
