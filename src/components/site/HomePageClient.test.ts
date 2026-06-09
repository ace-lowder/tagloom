import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePageClient from "@/components/site/HomePageClient";
import { PRICING_PLANS } from "@/components/pricing/PricingCards";
import { faqs } from "@/content/home";
import { NAV_LINKS } from "@/components/site/siteNavConfig";

const router = {
  push: vi.fn(),
  refresh: vi.fn(),
};

const mockRefs = vi.hoisted(() => ({
  dispatchGeneratorCta: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/",
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");

  const createMotionTag = (tag: keyof React.JSX.IntrinsicElements) => {
    return function MotionTag({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      variants: _variants,
      viewport: _viewport,
      whileInView: _whileInView,
      whileHover: _whileHover,
      whileTap: _whileTap,
      layout: _layout,
      ...rest
    }: Record<string, unknown> & { children?: React.ReactNode }) {
      return React.createElement(tag, rest, children);
    };
  };

  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_target, key) => createMotionTag(key as keyof React.JSX.IntrinsicElements),
      },
    ),
  };
});

vi.mock("@/components/generator/Generator", () => ({
  default: () => createElement("div", { "data-testid": "generator-mock" }),
}));

vi.mock("@/components/pricing/PricingCards", async () => {
  const actual = await vi.importActual<typeof import("@/components/pricing/PricingCards")>(
    "@/components/pricing/PricingCards",
  );

  return {
    ...actual,
    default: () => createElement("div", { "data-testid": "pricing-cards-mock" }),
  };
});

vi.mock("@/components/shared/SiteFooter", () => ({
  default: () => createElement("footer", { "data-testid": "site-footer-mock" }),
}));

vi.mock("@/components/auth/AuthController", () => ({
  useAuthController: () => ({
    openAuthModal: vi.fn(),
  }),
}));

vi.mock("@/components/toasts/toasts", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock("@/components/pricing/usePricingActions", () => ({
  usePricingActions: () => ({
    isAnyRedirecting: false,
    redirectingPlanId: null,
    onSelectPlan: vi.fn(),
    onManagePortal: vi.fn(),
  }),
}));

vi.mock("@/lib/generatorCta", () => ({
  consumePendingGeneratorCta: () => null,
  dispatchGeneratorCta: mockRefs.dispatchGeneratorCta,
}));

const pricingState = {
  isLoggedIn: false,
  currentTier: null,
  isExpiring: false,
  pendingRenewalTier: null,
  pendingRenewalAt: null,
  allowStarterPurchaseWithSubscription: true,
  canManageSubscription: false,
} as const;

function renderHome() {
  return render(createElement(HomePageClient, { pricingState }));
}

describe("HomePageClient funnel", () => {
  it("uses the simplified nav and pricing copy", () => {
    expect(NAV_LINKS.map((link) => link.label)).toEqual([
      "Home",
      "About",
      "Pricing",
      "Blog",
      "Support",
      "FAQ",
    ]);

    expect(PRICING_PLANS.find((plan) => plan.id === "monthly")?.features).toContain(
      "Save and compare past tags",
    );
    expect(PRICING_PLANS.find((plan) => plan.id === "yearly")?.features).toContain(
      "Save and compare past tags",
    );
  });

  it("renders the beginner FAQ funnel and keeps only one question open", () => {
    renderHome();

    const aboutHeading = screen.getByRole("heading", {
      name: "Turn your Etsy listing into searchable tags",
    });
    expect(aboutHeading).toBeInTheDocument();
    expect(aboutHeading).toHaveClass("lg:mx-auto", "lg:max-w-4xl");
    expect(aboutHeading.parentElement).toHaveClass(
      "mx-auto",
      "max-w-2xl",
      "text-left",
      "lg:max-w-5xl",
      "lg:text-center",
    );
    expect(
      screen.getByText(/Better tags can help your listings show up in more searches\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /One of the hardest parts of Etsy is helping the right shoppers find what you sell\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Tagloom reads your title and description, then suggests tags that fit your product and the shoppers likely searching for it\./,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("ABOUT")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Frequently asked questions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What is Tagloom?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "How do I get help if something goes wrong?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What is Tagloom?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "What are Etsy tags?" }));

    expect(screen.getByRole("button", { name: "What is Tagloom?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: "What are Etsy tags?" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      screen.getByText(
        /Etsy tags are keywords and phrases you add to a listing/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Shoppers do not always search with the same words you use in your title/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Good tags usually describe what the item is/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "blog" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Tagloom generator" })).toHaveLength(2);
    expect(
      screen.getByText(
        /see tag ideas for your own product\./,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "What are Etsy tags?" }));

    expect(screen.getByRole("button", { name: "What are Etsy tags?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "How do I get help if something goes wrong?" }));
    expect(screen.getByRole("link", { name: "support" })).toBeInTheDocument();
  });

  it("reuses the generator CTA for faq generator links", () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: "What is Tagloom?" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Tagloom generator" })[0]);

    expect(mockRefs.dispatchGeneratorCta).toHaveBeenCalledWith(
      { requestReset: true },
      { smoothScroll: true },
    );
  });

  it("renders the revised bottom CTA and removes the old funnel sections", () => {
    renderHome();

    expect(
      screen.getByRole("heading", {
        name: "Help more Etsy shoppers find what you sell",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Paste your listing into Tagloom, generate search tags, and copy your favorites into Etsy.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Generate tags for free" }),
    ).toHaveLength(2);
    expect(
      screen.queryByText("A simple workflow for ongoing tag improvement"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Blog Crash Course")).not.toBeInTheDocument();
    expect(screen.getByTestId("generator-mock")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-cards-mock")).toBeInTheDocument();
    expect(screen.getByTestId("site-footer-mock")).toBeInTheDocument();
  });

  it("uses the rewritten FAQ order", () => {
    expect(faqs.map((item) => item.question)).toEqual([
      "What is Tagloom?",
      "What are Etsy tags?",
      "Can better Etsy tags help me get more sales?",
      "How do I use Tagloom with my Etsy listing?",
      "How often should I update my tags?",
      "Can I save and compare past tag generations?",
      "What happens after I copy my tags into Etsy?",
      "How much does Tagloom cost?",
      "How do I get help if something goes wrong?",
    ]);
  });
});
