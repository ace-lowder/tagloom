import { describe, expect, it } from "vitest";

import { benefits } from "@/components/site/HomePageClient";

describe("HomePageClient benefits", () => {
  it("uses the expected feature card links", () => {
    expect(benefits.map((benefit) => [benefit.title, benefit.href])).toEqual([
      ["Get found in Etsy search", "/blog/how-to-rank-higher-on-etsy#why-tags-matter"],
      ["Get tags in seconds", "/blog/etsy-tag-tips-every-seller-should-know"],
      ["No more guesswork", "/blog/mistakes-new-etsy-sellers-make"],
    ]);
  });
});
