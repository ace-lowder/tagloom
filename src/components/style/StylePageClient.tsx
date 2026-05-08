"use client";

import { useState } from "react";
import { ArrowRight, Calendar, Check, ChevronRight, CreditCard, LogOut, Mail } from "lucide-react";

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
    <main className="min-h-screen bg-surface-lower px-5 pb-20 pt-28 text-ink">
      <div className="mx-auto max-w-6xl space-y-12">
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
          <div className="flex flex-wrap items-center gap-5">
            <div className="inline-flex rounded-xl border border-line bg-surface px-4 py-3">
              <BrandMark />
            </div>
            <button
              type="button"
              className="-m-2 px-2 py-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
            >
              <span className="relative pb-0.5 after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-orange-500 after:transition-transform after:duration-[250ms] hover:after:scale-x-100">
                Nav hover sample
              </span>
            </button>
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
            <Card className="group p-5 transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
                <ArrowRight className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold transition-colors group-hover:text-orange-600">Hover card state</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-weak">Feature cards lift and warm the border on hover.</p>
            </Card>
            <Card className="flex h-full flex-col border-stone-100 bg-stone-50 p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
                <Check className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-stone-900">Feature card pattern</h3>
              <p className="text-sm leading-relaxed text-stone-600">Used for compact benefit and explanation cards.</p>
            </Card>
            <Card className="p-6 transition-all hover:border-orange-200 hover:shadow-md">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">Tips</span>
                <span className="text-xs text-stone-400">4 min read</span>
              </div>
              <h3 className="mb-2 text-xl font-bold leading-snug text-stone-900">Blog card pattern</h3>
              <p className="mb-4 text-sm leading-relaxed text-stone-500">Article previews use badge, headline, excerpt, and quiet date metadata.</p>
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <Calendar className="h-3.5 w-3.5" />
                May 7, 2026
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
                <Mail className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="mb-1 font-semibold text-stone-800">Support topic pattern</h3>
              <p className="text-xs leading-relaxed text-stone-500">Topic cards pair a soft icon tile with compact helper copy.</p>
            </Card>
            <Card className="p-0">
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-stone-700">Support article row pattern</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                  <ChevronRight className="h-4 w-4 text-orange-600" />
                </span>
              </div>
            </Card>
            <Card className="relative flex h-full flex-col border-2 border-orange-400 p-7 shadow-xl shadow-orange-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1 text-xs font-semibold text-white shadow">Most Popular</span>
              </div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">Monthly</p>
              <p className="mb-4 text-sm text-stone-500">Pricing card pattern.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-stone-900">$19</span>
                <span className="ml-1 text-sm text-stone-400">/month</span>
              </div>
              <Button className="mt-auto w-full">Go monthly</Button>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-sm font-semibold text-orange-700 ring-1 ring-orange-200">
                  SE
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-stone-900">seller@example.com</p>
                  <span className="mt-1 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold leading-none text-orange-700 ring-1 ring-orange-200">Monthly</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                <Button variant="secondary" className="px-3 py-2.5"><CreditCard className="h-3.5 w-3.5" /> Manage Plan</Button>
                <Button variant="secondary" className="px-3 py-2.5"><LogOut className="h-3.5 w-3.5" /> Log out</Button>
              </div>
            </Card>
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
