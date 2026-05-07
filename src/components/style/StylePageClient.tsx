"use client";

import { useState } from "react";

import { toastMessages } from "@/components/toasts/toastMessages";
import { useToast, type ToastInput } from "@/components/toasts/toasts";
import BrandMark from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldLabel, FieldMessage, TextArea, TextInput } from "@/components/ui/form";

// === Components ===

export default function StylePageClient() {
  const { showToast } = useToast();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const runLoadingDemo = (key: string) => {
    setLoadingKey(key);
    window.setTimeout(() => setLoadingKey(null), 1000);
  };

  return (
    <main className="min-h-screen bg-surface-lower px-5 py-12 text-ink">
      <div className="mx-auto max-w-6xl space-y-12">
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Tagloom style</p>
          <h1 className="mt-2 text-4xl font-semibold">Design system test page</h1>
          <p className="mt-3 max-w-2xl text-ink-weak">
            Shared primitives, color tokens, form states, buttons, brand motion, cards, and toast copy.
          </p>
        </section>

        <Section title="Typography">
          <div className="space-y-3">
            <h1 className="text-5xl font-semibold">Heading one</h1>
            <h2 className="text-3xl font-semibold">Heading two</h2>
            <h3 className="text-xl font-semibold">Heading three</h3>
            <p className="max-w-2xl text-base text-ink-weak">
              Body text uses a quiet stone tone with enough contrast for repeated operational reading.
            </p>
            <p className="text-sm text-stone-500">Small text for supporting details and form help.</p>
          </div>
        </Section>

        <Section title="Colors">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {COLOR_SWATCHES.map((swatch) => (
              <div key={swatch.name} className="rounded-xl border border-line bg-surface p-3">
                <div className={`mb-3 h-12 rounded-lg border border-line ${swatch.className}`} />
                <p className="text-sm font-semibold">{swatch.name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Brand">
          <div className="inline-flex rounded-xl border border-line bg-surface px-4 py-3">
            <BrandMark />
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
            <Button
              isLoading={loadingKey === "primary"}
              loadingLabel="Updating..."
              onClick={() => runLoadingDemo("primary")}
            >
              Update listing
            </Button>
            <Button
              variant="secondary"
              isLoading={loadingKey === "secondary"}
              loadingLabel="Sending..."
              onClick={() => runLoadingDemo("secondary")}
            >
              Send message
            </Button>
          </div>
        </Section>

        <Section title="Forms">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="style-title">Listing title</FieldLabel>
              <TextInput id="style-title" placeholder="Handmade ceramic mug" />
              <FieldMessage className="mt-2">Helper text for expected input.</FieldMessage>
            </div>
            <div>
              <FieldLabel htmlFor="style-error">Email</FieldLabel>
              <TextInput id="style-error" aria-invalid placeholder="you@example.com" />
              <FieldMessage tone="error" className="mt-2">Enter a valid email address.</FieldMessage>
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="style-description">Description</FieldLabel>
              <TextArea id="style-description" rows={4} placeholder="Describe the product, material, audience, and occasion." />
            </div>
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm font-semibold text-stone-400">Card</p>
              <h3 className="mt-2 text-lg font-semibold">Shared surface</h3>
              <p className="mt-2 text-sm text-ink-weak">Rounded border, white surface, subtle shadow.</p>
            </Card>
            <StatusBadge label="Success" className="border-green-200 bg-green-50 text-success" />
            <StatusBadge label="Warning" className="border-amber-200 bg-amber-50 text-warning" />
          </div>
        </Section>

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
            onShow={showToast}
          />
          <ToastGroup
            title="Billing errors"
            items={[
              ["Checkout failed", toastMessages.checkoutFailed],
              ["Billing portal failed", toastMessages.billingPortalFailed],
            ]}
            onShow={showToast}
          />
          <ToastGroup
            title="Generation errors"
            items={[
              ["Generation failed", toastMessages.generationFailed],
              ["Generation resume failed", toastMessages.generationResumeFailed],
              ["Missing listing title", toastMessages.missingListingTitle],
              ["History load failed", toastMessages.historyLoadFailed],
            ]}
            onShow={showToast}
          />
          <ToastGroup
            title="Support messages"
            items={[
              ["Support message sent", toastMessages.supportMessageSent],
              ["Support message failed", toastMessages.supportMessageFailed],
            ]}
            onShow={showToast}
          />
          <ToastGroup
            title="Success messages"
            items={[
              ["Reset password email sent", toastMessages.resetPasswordEmailSent],
              ["Password updated", toastMessages.passwordUpdated],
              ["Account created", toastMessages.accountCreated],
            ]}
            onShow={showToast}
          />
        </Section>
      </div>
    </main>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="space-y-5">
      <h2 className="border-b border-line pb-2 text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function StatusBadge({ className, label }: { className: string; label: string }) {
  return (
    <Card className="flex items-center p-5">
      <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${className}`}>
        {label}
      </span>
    </Card>
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
          <Button key={label} variant="secondary" size="sm" onClick={() => onShow(message)}>
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// === Constants ===

const COLOR_SWATCHES = [
  { name: "surface", className: "bg-surface" },
  { name: "surface higher", className: "bg-surface-higher" },
  { name: "surface lower", className: "bg-surface-lower" },
  { name: "ink", className: "bg-ink" },
  { name: "ink weak", className: "bg-ink-weak" },
  { name: "line", className: "bg-line" },
  { name: "primary", className: "bg-primary" },
  { name: "danger", className: "bg-danger" },
  { name: "warning", className: "bg-warning" },
  { name: "success", className: "bg-success" },
  { name: "info", className: "bg-info" },
];
