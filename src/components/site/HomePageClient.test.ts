import { describe, expect, it } from "vitest";

import { benefits, heroCopy } from "@/components/site/HomePageClient";
import { aboutSectionCopy, featureSectionCopy } from "@/content/home";
import { PRIMARY_NAV_ACTION_LABEL } from "@/components/site/SiteNavParts";

describe("HomePageClient feature previews", () => {
  it("uses the expected static feature previews", () => {
    expect(benefits.map((benefit) => [benefit.title, benefit.description])).toEqual([
      ["Paste your listing", "Generate tags from an existing Etsy title and description."],
      ["Compare Generator + History", "Review saved generations and compare previous tag sets."],
      ["Copy tags into Etsy", "Copy your generated tags and update your listing in Etsy."],
    ]);
    expect(featureSectionCopy).toEqual({
      eyebrow: "FEATURES",
      heading: "A simple workflow for ongoing tag improvement",
      subcopy: "Paste a listing, save each generation, and copy your best tags into Etsy.",
      steps: [
        {
          title: "Paste your listing",
          description: "Generate tags from an existing Etsy title and description.",
        },
        {
          title: "Compare Generator + History",
          description: "Review saved generations and compare previous tag sets.",
        },
        {
          title: "Copy tags into Etsy",
          description: "Copy your generated tags and update your listing in Etsy.",
        },
      ],
      demoTitle: "Vanilla Soy Candle in Amber Jar",
      demoDescription: "Warm vanilla candle for cozy home gifts",
      historyRows: ["Vanilla candle tags", "Ring gift tags", "Birthday invite tags"],
      copyTags: [
        "soy candle",
        "amber jar candle",
        "vanilla home gift",
        "cozy candle",
        "housewarming gift",
      ],
    });
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
