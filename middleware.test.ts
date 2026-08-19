import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";

describe("legacy domain redirect", () => {
  it("preserves the path and query string for tagloom.app", () => {
    const response = middleware(
      new NextRequest("https://tagloom.app/support/account?article=reset-password"),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://updatetags.com/support/account?article=reset-password",
    );
  });

  it("keeps the legacy Stripe webhook available during the transition", () => {
    const response = middleware(
      new NextRequest("https://tagloom.app/api/stripe/webhook"),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("does not redirect the new canonical domain", () => {
    const response = middleware(new NextRequest("https://updatetags.com/pricing"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects the new www domain to the canonical host", () => {
    const response = middleware(new NextRequest("https://www.updatetags.com/blog"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://updatetags.com/blog");
  });
});
