import { NextRequest, NextResponse } from "next/server";

const LEGACY_HOSTS = new Set(["tagloom.app", "www.tagloom.app"]);
const LEGACY_WEBHOOK_PATH = "/api/stripe/webhook";
const CANONICAL_HOST = "updatetags.com";
const WWW_HOST = `www.${CANONICAL_HOST}`;

export function middleware(request: NextRequest) {
  const host = request.nextUrl.hostname.toLowerCase();

  if (host === WWW_HOST || (LEGACY_HOSTS.has(host) && request.nextUrl.pathname !== LEGACY_WEBHOOK_PATH)) {
    return redirectToCanonicalHost(request);
  }

  return NextResponse.next();
}

function redirectToCanonicalHost(request: NextRequest) {
  const destination = request.nextUrl.clone();
  destination.protocol = "https:";
  destination.hostname = CANONICAL_HOST;
  destination.port = "";

  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
