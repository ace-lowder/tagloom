import type { ToastInput } from "@/components/toasts/toasts";

// === Constants ===

export const toastMessages = {
  loginFailed: {
    title: "Login failed",
    body: "Check your email and password, then try again.",
    type: "danger",
  },
  signupFailed: {
    title: "Signup failed",
    body: "Could not create your account. Please try again.",
    type: "danger",
  },
  googleLoginFailed: {
    title: "Google sign-in failed",
    body: "Could not finish Google sign-in. Please try again.",
    type: "danger",
  },
  resetPasswordRequestFailed: {
    title: "Password reset failed",
    body: "Could not send a reset email. Please try again.",
    type: "danger",
  },
  resetLinkCheckFailed: {
    title: "Reset link check failed",
    body: "Could not check this reset link. Please request a new one.",
    type: "danger",
  },
  passwordUpdateFailed: {
    title: "Password update failed",
    body: "Could not update your password. Please try again.",
    type: "danger",
  },
  accountCheckFailed: {
    title: "Account check failed",
    body: "Could not check account right now.",
    type: "danger",
  },
  authNotConfigured: {
    title: "Auth is not configured",
    body: "Please contact support so we can finish account setup.",
    type: "danger",
  },
  resetPasswordEmailSent: {
    title: "Reset email sent",
    body: "If an account exists for that email, reset instructions will arrive shortly.",
    type: "success",
  },
  passwordUpdated: {
    title: "Password updated",
    body: "Your password has been changed. Redirecting you now.",
    type: "success",
  },
  signupBlockedCooldown: {
    title: "Signup temporarily blocked",
    body: "A free trial was already started recently from this browser. Try again later or log in if you already created an account.",
    type: "danger",
  },
  botCheckFailed: {
    title: "Bot check failed",
    body: "Please complete the bot check and try again.",
    type: "danger",
  },
  checkoutFailed: {
    title: "Checkout failed",
    body: "We could not open checkout. Please try again.",
    type: "danger",
  },
  billingPortalFailed: {
    title: "Billing portal failed",
    body: "We could not open the billing portal. Please try again.",
    type: "danger",
  },
  supportMessageSent: {
    title: "Support message sent",
    body: "Your message was sent. We'll follow up by email.",
    type: "success",
  },
  supportMessageFailed: {
    title: "Support message failed",
    body: "We could not submit your message. Please try again.",
    type: "danger",
  },
  generationFailed: {
    title: "Generation failed",
    body: "We could not generate tags. Please try again.",
    type: "danger",
  },
  generationResumeFailed: {
    title: "Generation resume failed",
    body: "Login or checkout finished, but generation could not resume. Try generating again.",
    type: "danger",
  },
  missingListingTitle: {
    title: "Missing listing title",
    body: "Enter a listing title before continuing.",
    type: "danger",
  },
  historyLoadFailed: {
    title: "History load failed",
    body: "Saved generations could not be loaded right now.",
    type: "danger",
  },
  accountCreated: {
    title: "Account created",
    body: "Your free generation is ready. Try it now.",
    type: "success",
  },
} satisfies Record<string, ToastInput>;
