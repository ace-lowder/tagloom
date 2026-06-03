import { describe, expect, it } from "vitest";

import { benefits, heroCopy } from "@/components/site/HomePageClient";
import { aboutSectionCopy } from "@/content/home";
import { PRIMARY_NAV_ACTION_LABEL } from "@/components/site/SiteNavParts";

describe("HomePageClient feature previews", () => {
  it("uses the expected static feature previews", () => {
    expect(benefits.map((benefit) => [benefit.title, benefit.actionLabel])).toEqual([
      ["Paste a live Etsy listing", "Generate"],
      ["Compare in Generator + History", "History"],
      ["Copy tags into Etsy", "Copy tags"],
    ]);
  });

  it("uses the clarified hero and nav copy", () => {
    expect(heroCopy).toEqual({
      pill: "Etsy tag generator for sellers",
      headlineStart: "Generate Etsy tags that",
      headlineEmphasis: "help shoppers find your listings",
      body:
        "Etsy tags are keywords shoppers search for. Paste your listing, generate tags, and copy them into Etsy.",
      cta: "Generate tags for free",
    });
    expect(PRIMARY_NAV_ACTION_LABEL).toBe("Try free");
  });

  it("uses the clarified about section copy", () => {
    expect(aboutSectionCopy).toEqual({
      eyebrow: "ABOUT",
      heading: "Tagloom turns your Etsy listing into searchable tags",
      body:
        "Etsy tags are keywords shoppers use to find products. If your tags are too broad, missing details, or copied from noisy listing text, your products can be harder to find. Tagloom reads your existing listing and suggests tags that match what you sell, so you can copy your generated tags into Etsy and keep testing new tag sets as your listings change.",
      cta: "Learn more",
    });
  });
});
