"use client";

import { type ReactNode } from "react";
import FeedbackButtons from "@/components/feedback/FeedbackButtons";
import { toastMessages } from "@/components/toasts/toastMessages";
import { type ToastInput } from "@/components/toasts/toasts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ToastsSection({
  onShow,
}: {
  onShow: (toast: ToastInput) => string;
}) {
  return (
    <Section title="Toasts">
      <ToastGroup
        title="Auth errors"
        items={[
          ["Incorrect password/login failed", toastMessages.loginFailed],
          ["Signup failed", toastMessages.signupFailed],
          ["Google sign-in failed", toastMessages.googleLoginFailed],
          ["Password reset failed", toastMessages.resetPasswordRequestFailed],
          ["Reset link check failed", toastMessages.resetLinkCheckFailed],
          ["Password update failed", toastMessages.passwordUpdateFailed],
          ["Account check failed", toastMessages.accountCheckFailed],
          ["Auth not configured", toastMessages.authNotConfigured],
          ["Signup cooldown", toastMessages.signupBlockedCooldown],
          ["Bot check failed", toastMessages.botCheckFailed],
        ]}
        onShow={onShow}
      />
      <ToastGroup
        title="Billing errors"
        items={[
          ["Checkout failed", toastMessages.checkoutFailed],
          ["Billing portal failed", toastMessages.billingPortalFailed],
        ]}
        onShow={onShow}
      />
      <ToastGroup
        title="Generation errors"
        items={[
          ["Generation failed", toastMessages.generationFailed],
          ["Generation resume failed", toastMessages.generationResumeFailed],
          ["Missing listing title", toastMessages.missingListingTitle],
          ["History load failed", toastMessages.historyLoadFailed],
          ["History loaded", toastMessages.historyLoaded],
        ]}
        onShow={onShow}
      />
      <ToastGroup
        title="Support messages"
        items={[
          ["Support message sent", toastMessages.supportMessageSent],
          ["Support message failed", toastMessages.supportMessageFailed],
        ]}
        onShow={onShow}
      />
      <ToastGroup
        title="Success messages"
        items={[
          ["Reset password email sent", toastMessages.resetPasswordEmailSent],
          ["Password updated", toastMessages.passwordUpdated],
          ["Account created", toastMessages.accountCreated],
        ]}
        onShow={onShow}
      />
    </Section>
  );
}

export function FeedbackSection({
  onOpenFeedbackModal,
}: {
  onOpenFeedbackModal: () => void;
}) {
  return (
    <Section title="Feedback">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold text-stone-800">
            Feedback button states
          </p>
          <div className="flex items-center gap-4">
            <FeedbackButtons rating={null} onUp={() => {}} onDown={() => {}} />
            <FeedbackButtons rating="up" onUp={() => {}} onDown={() => {}} />
            <FeedbackButtons rating="down" onUp={() => {}} onDown={() => {}} />
            <FeedbackButtons
              rating={null}
              disabled
              onUp={() => {}}
              onDown={() => {}}
            />
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold text-stone-800">
            Downvote modal sample
          </p>
          <Button variant="secondary" size="sm" onClick={onOpenFeedbackModal}>
            Open feedback modal
          </Button>
        </Card>
      </div>
    </Section>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="space-y-5">
      <h2 className="border-b border-line pb-2 text-2xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ToastGroup({
  items,
  onShow,
  title,
}: {
  items: Array<[string, ToastInput]>;
  onShow: (toast: ToastInput) => string;
  title: string;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-3">
        {items.map(([label, message]) => (
          <Button
            key={label}
            variant="secondary"
            size="sm"
            onClick={() => onShow(message)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
