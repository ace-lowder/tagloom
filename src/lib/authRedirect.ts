const AUTH_CONFIG_ERROR =
  "Auth is not configured correctly. Please contact support.";

export { AUTH_CONFIG_ERROR };

export function getPublicSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!rawUrl) {
    throw new Error(AUTH_CONFIG_ERROR);
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(AUTH_CONFIG_ERROR);
  }

  if (!["http:", "https:"].includes(url.protocol) || url.hostname === "0.0.0.0") {
    throw new Error(AUTH_CONFIG_ERROR);
  }

  return rawUrl.replace(/\/+$/, "");
}

export function buildAuthCallbackUrl(next: string, flow?: "popup" | "redirect") {
  const callbackUrl = new URL("/auth/callback", getPublicSiteUrl());
  callbackUrl.searchParams.set("next", next);
  if (flow) {
    callbackUrl.searchParams.set("flow", flow);
  }

  return callbackUrl.toString();
}

export function buildPublicUrl(path: string) {
  return new URL(path, getPublicSiteUrl()).toString();
}
