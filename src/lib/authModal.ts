export const AUTH_POPUP_MESSAGE_SOURCE = "updatetags-auth-popup";
export const AUTH_SUCCESS_EVENT = "updatetags:auth-success";

export type AuthMode = "login" | "signup";

export type OpenAuthModalOptions = {
  mode?: AuthMode;
  source?: string;
  next?: string;
};

export function sanitizeNextPath(next: string | null | undefined): string {
  if (typeof next !== "string") return "/";
  if (!/^\/(?!\/)/.test(next)) return "/";
  if (next.includes("\\")) return "/";
  return next;
}

export function dispatchAuthSuccess() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SUCCESS_EVENT));
}
