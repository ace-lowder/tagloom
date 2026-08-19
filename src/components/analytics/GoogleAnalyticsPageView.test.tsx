import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GoogleAnalyticsPageView from "./GoogleAnalyticsPageView";

const usePathnameMock = vi.fn();
const useSearchParamsMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useSearchParams: () => useSearchParamsMock(),
}));

describe("GoogleAnalyticsPageView", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
    useSearchParamsMock.mockReset();
    document.title = "UpdateTags Test Page";
    window.history.replaceState({}, "", "http://localhost:3000/");
  });

  it("sends page_view with path, location, and title", () => {
    usePathnameMock.mockReturnValue("/blog");
    useSearchParamsMock.mockReturnValue(new URLSearchParams(""));

    const gtagMock = vi.fn();
    window.gtag = gtagMock;

    render(<GoogleAnalyticsPageView />);

    expect(gtagMock).toHaveBeenCalledWith("event", "page_view", {
      page_path: "/blog",
      page_location: "http://localhost:3000/blog",
      page_title: "UpdateTags Test Page",
    });
  });

  it("preserves query strings including UTM params", () => {
    usePathnameMock.mockReturnValue("/blog");
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        "utm_source=youtube&utm_medium=paid&utm_campaign=local_test",
      ),
    );

    const gtagMock = vi.fn();
    window.gtag = gtagMock;

    render(<GoogleAnalyticsPageView />);

    expect(gtagMock).toHaveBeenCalledWith("event", "page_view", {
      page_path: "/blog?utm_source=youtube&utm_medium=paid&utm_campaign=local_test",
      page_location:
        "http://localhost:3000/blog?utm_source=youtube&utm_medium=paid&utm_campaign=local_test",
      page_title: "UpdateTags Test Page",
    });
  });

  it("queues page view in dataLayer when gtag is unavailable", () => {
    usePathnameMock.mockReturnValue("/");
    useSearchParamsMock.mockReturnValue(new URLSearchParams(""));

    window.dataLayer = undefined;
    window.gtag = undefined;

    render(<GoogleAnalyticsPageView />);

    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer?.[0]).toEqual([
      "event",
      "page_view",
      {
        page_path: "/",
        page_location: "http://localhost:3000/",
        page_title: "UpdateTags Test Page",
      },
    ]);
  });
});
