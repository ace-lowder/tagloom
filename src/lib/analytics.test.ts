import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildGoogleAnalyticsPagePath,
  sendGoogleAnalyticsPageView,
} from "@/lib/analytics";

describe("buildGoogleAnalyticsPagePath", () => {
  it("builds root path without query params", () => {
    expect(buildGoogleAnalyticsPagePath("/", new URLSearchParams(""))).toBe("/");
  });

  it("builds path with query params including utm values", () => {
    const searchParams = new URLSearchParams(
      "utm_source=youtube&utm_medium=paid&utm_campaign=launch_test_1",
    );

    expect(buildGoogleAnalyticsPagePath("/blog", searchParams)).toBe(
      "/blog?utm_source=youtube&utm_medium=paid&utm_campaign=launch_test_1",
    );
  });
});

describe("sendGoogleAnalyticsPageView", () => {
  beforeEach(() => {
    document.title = "UpdateTags Analytics Test";
    window.history.replaceState({}, "", "http://localhost:3000/");
    window.dataLayer = undefined;
    window.gtag = undefined;
  });

  it("calls existing gtag with page view payload", () => {
    const gtagMock = vi.fn();
    window.gtag = gtagMock;

    sendGoogleAnalyticsPageView("/blog");

    expect(gtagMock).toHaveBeenCalledWith("event", "page_view", {
      page_path: "/blog",
      page_location: "http://localhost:3000/blog",
      page_title: "UpdateTags Analytics Test",
    });
  });

  it("creates dataLayer and queues page view when gtag is missing", () => {
    sendGoogleAnalyticsPageView(
      "/blog?utm_source=youtube&utm_medium=paid&utm_campaign=launch_test_1",
    );

    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer?.[0]).toEqual([
      "event",
      "page_view",
      {
        page_path: "/blog?utm_source=youtube&utm_medium=paid&utm_campaign=launch_test_1",
        page_location:
          "http://localhost:3000/blog?utm_source=youtube&utm_medium=paid&utm_campaign=launch_test_1",
        page_title: "UpdateTags Analytics Test",
      },
    ]);
  });

  it("does not throw when browser globals are unavailable", () => {
    expect(() => sendGoogleAnalyticsPageView("/blog")).not.toThrow();
  });
});
