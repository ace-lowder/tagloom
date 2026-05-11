import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GoogleAnalytics from "./GoogleAnalytics";

vi.mock("next/script", () => ({
  default: ({ children, ...props }: React.ComponentProps<"script">) => (
    <script {...props}>{children}</script>
  ),
}));

vi.mock("@/components/analytics/GoogleAnalyticsPageView", () => ({
  __esModule: true,
  default: () => <div data-testid="ga-pageview" />,
}));

const originalGaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

beforeEach(() => {
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = originalGaMeasurementId;
});

afterEach(() => {
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = originalGaMeasurementId;
});

describe("GoogleAnalytics", () => {
  it("renders nothing when measurement ID is missing", () => {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

    const html = renderToStaticMarkup(<GoogleAnalytics />);

    expect(html).toBe("");
  });

  it("renders nothing when measurement ID is blank", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "   ";

    const html = renderToStaticMarkup(<GoogleAnalytics />);

    expect(html).toBe("");
  });

  it("renders GA script and init config when measurement ID is set", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST123";

    const html = renderToStaticMarkup(<GoogleAnalytics />);

    expect(html).toContain(
      "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
    );
    expect(html).toContain("send_page_view: false");
    expect(html).toContain("window.gtag(&quot;config&quot;, &quot;G-TEST123&quot;");
  });
});
