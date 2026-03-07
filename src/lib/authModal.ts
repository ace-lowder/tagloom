export const AUTH_POPUP_MESSAGE_SOURCE = "tagloom-auth-popup";
export const AUTH_SUCCESS_EVENT = "tagloom:auth-success";

export type AuthMode = "login" | "signup";

export type OpenAuthModalOptions = {
  mode?: AuthMode;
  source?: string;
  next?: string;
};

export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  return next;
}

export function dispatchAuthSuccess() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SUCCESS_EVENT));
}
