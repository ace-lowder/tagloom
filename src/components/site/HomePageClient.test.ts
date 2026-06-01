import { describe, expect, it } from "vitest";

import { benefits } from "@/components/site/HomePageClient";

describe("HomePageClient feature previews", () => {
  it("uses the expected static feature previews", () => {
    expect(benefits.map((benefit) => [benefit.title, benefit.actionLabel])).toEqual([
      ["Paste a live Etsy listing", "Generate"],
      ["Compare in Generator + History", "History"],
      ["Copy tags into Etsy", "Copy tags"],
    ]);
  });
});
