"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  buildGoogleAnalyticsPagePath,
  sendGoogleAnalyticsPageView,
} from "@/lib/analytics";

export default function GoogleAnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const pagePath = buildGoogleAnalyticsPagePath(pathname, searchParams);
    sendGoogleAnalyticsPageView(pagePath);
  }, [pathname, searchParams]);

  return null;
}
