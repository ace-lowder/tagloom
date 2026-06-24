import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/authModal";
import { AUTH_CONFIG_ERROR, buildPublicUrl } from "@/lib/authRedirect";

const POPUP_AUTH_ERROR_MESSAGE = "Could not finish sign-in. Please try again.";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flow = requestUrl.searchParams.get("flow");
  const safeNext = sanitizeNextPath(requestUrl.searchParams.get("next"));

  let popupCompleteUrl: URL;
  let verificationCompleteUrl: URL;
  let finalRedirectUrl: string;
  try {
    popupCompleteUrl = new URL(buildPublicUrl("/auth/popup-complete"));
    verificationCompleteUrl = new URL(buildPublicUrl("/verify"));
    finalRedirectUrl = buildPublicUrl(safeNext);
  } catch {
    return new Response(AUTH_CONFIG_ERROR, { status: 500 });
  }

  popupCompleteUrl.searchParams.set("next", safeNext);
  verificationCompleteUrl.searchParams.set("next", safeNext);

  if (code) {
    const supabase = createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (flow === "popup") {
        if (error) {
          popupCompleteUrl.searchParams.set("status", "error");
          popupCompleteUrl.searchParams.set("message", POPUP_AUTH_ERROR_MESSAGE);
        } else {
          popupCompleteUrl.searchParams.set("status", "success");
        }
        return NextResponse.redirect(popupCompleteUrl.toString());
      }
      if (flow === "email_verification") {
        verificationCompleteUrl.searchParams.set("status", error ? "error" : "success");
        return NextResponse.redirect(verificationCompleteUrl.toString());
      }
    }
  }

  if (flow === "popup") {
    popupCompleteUrl.searchParams.set("status", "error");
    popupCompleteUrl.searchParams.set("message", POPUP_AUTH_ERROR_MESSAGE);
    return NextResponse.redirect(popupCompleteUrl.toString());
  }

  if (flow === "email_verification") {
    verificationCompleteUrl.searchParams.set("status", "error");
    return NextResponse.redirect(verificationCompleteUrl.toString());
  }

  return NextResponse.redirect(finalRedirectUrl);
}
