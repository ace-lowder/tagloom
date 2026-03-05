export const GENERATOR_CTA_EVENT = "tagloom:generator-cta";
const PENDING_GENERATOR_CTA_KEY = "tagloom:pending-generator-cta";

type GeneratorCtaDetail = {
  requestReset: boolean;
};

type TriggerGeneratorCtaOptions = {
  isHomePage: boolean;
  navigateHome: () => void;
  requestReset?: boolean;
};

export function dispatchGeneratorCta(detail: GeneratorCtaDetail = { requestReset: true }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<GeneratorCtaDetail>(GENERATOR_CTA_EVENT, { detail }));
}

export function triggerGeneratorCta({
  isHomePage,
  navigateHome,
  requestReset = true,
}: TriggerGeneratorCtaOptions) {
  if (typeof window === "undefined") return;

  if (isHomePage) {
    dispatchGeneratorCta({ requestReset });
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
