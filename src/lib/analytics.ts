export function buildGoogleAnalyticsPagePath(
  pathname: string,
  searchParams: Pick<URLSearchParams, "toString">,
): string {
  const queryString = searchParams.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
}

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

export function sendGoogleAnalyticsPageView(pagePath: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];

  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }

  const pageLocation = `${window.location.origin}${pagePath}`;
  const pageTitle = document.title;

  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: pageLocation,
    page_title: pageTitle,
  });
}
