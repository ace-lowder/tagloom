import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/authModal";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flow = requestUrl.searchParams.get("flow");
  const safeNext = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const popupCompleteUrl = new URL("/auth/popup-complete", requestUrl.origin);
  popupCompleteUrl.searchParams.set("next", safeNext);

  if (code) {
    const supabase = createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (flow === "popup") {
        if (error) {
          popupCompleteUrl.searchParams.set("status", "error");
          popupCompleteUrl.searchParams.set("message", error.message);
        } else {
          popupCompleteUrl.searchParams.set("status", "success");
        }
        return NextResponse.redirect(popupCompleteUrl.toString());
      }
    }
  }

  if (flow === "popup") {
    popupCompleteUrl.searchParams.set("status", "error");
    popupCompleteUrl.searchParams.set(
      "message",
      requestUrl.searchParams.get("error_description") ||
        requestUrl.searchParams.get("error") ||
        "Google sign-in failed.",
    );
    return NextResponse.redirect(popupCompleteUrl.toString());
  }

  return NextResponse.redirect(`${requestUrl.origin}${safeNext}`);
}
