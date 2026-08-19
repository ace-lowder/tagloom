export const GENERATOR_CTA_EVENT = "updatetags:generator-cta";
const PENDING_GENERATOR_CTA_KEY = "updatetags:pending-generator-cta";
export const GENERATOR_CTA_SCROLL_SETTLE_MS = 900;

type GeneratorCtaDetail = {
  requestReset: boolean;
};

type TriggerGeneratorCtaOptions = {
  isHomePage: boolean;
  navigateHome: () => void;
  requestReset?: boolean;
};

type DispatchGeneratorCtaOptions = {
  smoothScroll?: boolean;
};

function dispatchCtaEvent(detail: GeneratorCtaDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<GeneratorCtaDetail>(GENERATOR_CTA_EVENT, { detail }));
}

export function dispatchGeneratorCta(
  detail: GeneratorCtaDetail = { requestReset: true },
  options: DispatchGeneratorCtaOptions = {},
) {
  if (typeof window === "undefined") return;

  if (!options.smoothScroll) {
    dispatchCtaEvent(detail);
    return;
  }

  document
    .getElementById("generator")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });

  window.setTimeout(() => dispatchCtaEvent(detail), GENERATOR_CTA_SCROLL_SETTLE_MS);
}

export function triggerGeneratorCta({
  isHomePage,
  navigateHome,
  requestReset = true,
}: TriggerGeneratorCtaOptions) {
  if (typeof window === "undefined") return;

  if (isHomePage) {
    dispatchGeneratorCta({ requestReset }, { smoothScroll: true });
    return;
  }

  sessionStorage.setItem(
    PENDING_GENERATOR_CTA_KEY,
    JSON.stringify({ requestReset }),
  );
  navigateHome();
}

export function consumePendingGeneratorCta(): GeneratorCtaDetail | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(PENDING_GENERATOR_CTA_KEY);
  if (!raw) return null;

  sessionStorage.removeItem(PENDING_GENERATOR_CTA_KEY);

  try {
    const parsed = JSON.parse(raw) as Partial<GeneratorCtaDetail>;
    return { requestReset: parsed.requestReset !== false };
  } catch {
    return { requestReset: true };
  }
}
