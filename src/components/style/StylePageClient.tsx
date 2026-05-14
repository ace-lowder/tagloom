"use client";

import { useState } from "react";
import {
  Archive,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  LogOut,
  Mail,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

import FeedbackButtons from "@/components/feedback/FeedbackButtons";
import FeedbackModal from "@/components/feedback/FeedbackModal";
import { toastMessages } from "@/components/toasts/toastMessages";
import { useToast, type ToastInput } from "@/components/toasts/toasts";
import BrandMark from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FieldLabel,
  FieldMessage,
  TextArea,
  TextInput,
} from "@/components/ui/form";

// === Components ===

export default function StylePageClient({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { showToast } = useToast();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [showFeedbackModalSample, setShowFeedbackModalSample] = useState(false);

  const runLoadingDemo = (key: string) => {
    setLoadingKey(key);
    window.setTimeout(() => setLoadingKey(null), 1000);
  };

  return (
    <main
      className={
        embedded
          ? "min-h-full bg-surface-lower text-ink"
          : "min-h-screen bg-surface-lower px-5 pb-20 pt-28 text-ink"
      }
    >
      <div
        className={
          embedded
            ? "mx-auto max-w-6xl space-y-12 px-5 py-6"
            : "mx-auto max-w-6xl space-y-12"
        }
      >
        <Section title="Typography">
          <div className="space-y-3">
            <h1 className="text-5xl font-semibold">Heading one</h1>
            <h2 className="text-3xl font-semibold">Heading two</h2>
            <h3 className="text-xl font-semibold">Heading three</h3>
            <p className="max-w-2xl text-base text-ink-weak">
              Body text uses a quiet stone tone with enough contrast for
              repeated operational reading.
            </p>
            <p className="text-sm text-stone-500">
              Small text for supporting details and form help.
            </p>
          </div>
        </Section>

        <Section title="Colors">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {COLOR_SWATCHES.map((swatch) => (
              <div
                key={swatch.name}
                className="rounded-xl border border-line bg-surface p-3"
              >
                <div
                  className={`mb-3 h-12 rounded-lg border border-line ${swatch.className}`}
                />
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
              <FieldMessage className="mt-2">
                Helper text for expected input.
              </FieldMessage>
            </div>
            <div>
              <FieldLabel htmlFor="style-error">Email</FieldLabel>
              <TextInput
                id="style-error"
                aria-invalid
                placeholder="you@example.com"
              />
              <FieldMessage tone="error" className="mt-2">
                Enter a valid email address.
              </FieldMessage>
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="style-description">Description</FieldLabel>
              <TextArea
                id="style-description"
                rows={4}
                placeholder="Describe the product, material, audience, and occasion."
              />
            </div>
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm font-semibold text-stone-400">Card</p>
              <h3 className="mt-2 text-lg font-semibold">Shared surface</h3>
              <p className="mt-2 text-sm text-ink-weak">
                Rounded border, white surface, subtle shadow.
              </p>
            </Card>
            <Card className="group p-5 transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
                <ArrowRight className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold transition-colors group-hover:text-orange-600">
                Hover card state
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-weak">
                Feature cards lift and warm the border on hover.
              </p>
            </Card>
            <Card className="flex h-full flex-col border-stone-100 bg-stone-50 p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
                <Check className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-stone-900">
                Feature card pattern
              </h3>
              <p className="text-sm leading-relaxed text-stone-600">
                Used for compact benefit and explanation cards.
              </p>
            </Card>
            <Card className="p-6 transition-all hover:border-orange-200 hover:shadow-md">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                  Tips
                </span>
                <span className="text-xs text-stone-400">4 min read</span>
              </div>
              <h3 className="mb-2 text-xl font-bold leading-snug text-stone-900">
                Blog card pattern
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-stone-500">
                Article previews use badge, headline, excerpt, and quiet date
                metadata.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <Calendar className="h-3.5 w-3.5" />
                May 7, 2026
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
                <Mail className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="mb-1 font-semibold text-stone-800">
                Support topic pattern
              </h3>
              <p className="text-xs leading-relaxed text-stone-500">
                Topic cards pair a soft icon tile with compact helper copy.
              </p>
            </Card>
            <Card className="p-0">
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-stone-700">
                  Support article row pattern
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                  <ChevronRight className="h-4 w-4 text-orange-600" />
                </span>
              </div>
            </Card>
            <Card className="relative flex h-full flex-col border-2 border-orange-400 p-7 shadow-xl shadow-orange-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  Most Popular
                </span>
              </div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Monthly
              </p>
              <p className="mb-4 text-sm text-stone-500">
                Pricing card pattern.
              </p>
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
                  <p className="truncate text-sm font-semibold text-stone-900">
                    seller@example.com
                  </p>
                  <span className="mt-1 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold leading-none text-orange-700 ring-1 ring-orange-200">
                    Monthly
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                <Button variant="secondary" className="px-3 py-2.5">
                  <CreditCard className="h-3.5 w-3.5" /> Manage Plan
                </Button>
                <Button variant="secondary" className="px-3 py-2.5">
                  <LogOut className="h-3.5 w-3.5" /> Log out
                </Button>
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
              [
                "Password reset failed",
                toastMessages.resetPasswordRequestFailed,
              ],
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
              [
                "Generation resume failed",
                toastMessages.generationResumeFailed,
              ],
              ["Missing listing title", toastMessages.missingListingTitle],
              ["History load failed", toastMessages.historyLoadFailed],
              ["History loaded", toastMessages.historyLoaded],
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
              [
                "Reset password email sent",
                toastMessages.resetPasswordEmailSent,
              ],
              ["Password updated", toastMessages.passwordUpdated],
              ["Account created", toastMessages.accountCreated],
            ]}
            onShow={showToast}
          />
        </Section>

        <Section title="Generation History">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-semibold text-stone-700">
                    Tagloom Generator
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Show generation history"
                  aria-pressed="false"
                  className="relative inline-flex h-[36px] w-[64px] items-center rounded-full border border-stone-200 bg-white/85 p-[3px]"
                >
                  <span className="absolute left-[3px] top-[3px] flex h-7 w-7 items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-stone-500 opacity-50" />
                  </span>
                  <span className="absolute left-[31px] top-[3px] flex h-7 w-7 items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-stone-500 opacity-50" />
                  </span>
                  <span className="absolute left-[3px] top-[3px] flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <Clock className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-semibold text-stone-700">
                    Generation History
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Show generator"
                  aria-pressed="true"
                  className="relative inline-flex h-[35px] w-[62px] items-center rounded-full border border-stone-200 bg-white/85 p-[3px]"
                >
                  <span className="absolute left-[3px] top-[3px] flex h-7 w-7 items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-stone-500 opacity-50" />
                  </span>
                  <span className="absolute left-[31px] top-[3px] flex h-7 w-7 items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-stone-500 opacity-50" />
                  </span>
                  <span className="absolute left-[31px] top-[3px] flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
                    <Clock className="h-3.5 w-3.5 text-white" />
                  </span>
                </button>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-stone-200 bg-white/70 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                  <Clock className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-stone-800">
                  No generation history
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  Generate tags and view your past generations here.
                </p>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="max-h-[280px] overflow-y-auto">
              <div className="sticky top-0 z-10 grid grid-cols-[118px_minmax(130px,1.1fr)_minmax(150px,1.5fr)_92px_48px] border-b border-stone-200 bg-white/90 text-[11px] font-semibold uppercase text-stone-500">
                <button className="flex items-center gap-1 bg-transparent px-3 py-2.5 text-left hover:bg-stone-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-300/70">
                  Date <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button className="flex items-center gap-1 bg-transparent px-3 py-2.5 text-left hover:bg-stone-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-300/70">
                  Title <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button className="bg-transparent px-3 py-2.5 text-left hover:bg-stone-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-300/70">
                  Description
                </button>
                <button className="col-span-2 flex items-center gap-1 bg-transparent px-3 py-2.5 text-left hover:bg-stone-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-300/70">
                  Status{" "}
                  <Archive className="h-3 w-3 translate-x-0.5 text-stone-500" />
                </button>
              </div>
              {STYLE_HISTORY_ROWS.map((row) => (
                <div
                  key={row.title}
                  className={`grid grid-cols-[118px_minmax(130px,1.1fr)_minmax(150px,1.5fr)_92px_48px] items-center border-b border-stone-100 text-sm last:border-b-0 ${row.selected ? "bg-orange-50" : "bg-white"}`}
                >
                  <span className="truncate px-3 py-3 text-xs font-medium text-stone-500">
                    {row.date}
                  </span>
                  <span className="truncate px-3 py-3 font-semibold text-stone-800">
                    {row.title}
                  </span>
                  <span className="truncate px-3 py-3 text-stone-600">
                    {row.description}
                  </span>
                  <span className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize leading-none ${row.statusClass}`}
                    >
                      {row.status}
                    </span>
                  </span>
                  <span className="flex justify-end px-2 py-2">
                    {row.status === "draft" ? (
                      <button
                        aria-label="Delete draft sample"
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-stone-500 hover:bg-orange-100 hover:text-orange-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : row.status === "generated" ? (
                      <button
                        aria-label="Archive generation sample"
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-stone-500 hover:bg-orange-100 hover:text-orange-700"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        aria-label="Restore generation sample"
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-stone-500 hover:bg-orange-100 hover:text-orange-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="max-w-sm p-5">
            <h3 className="text-base font-semibold text-stone-900">
              Archive generation?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              This hides the generation from normal history without deleting it
              from your account.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button size="sm">Archive generation</Button>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </div>
          </Card>
        </Section>

        <Section title="Feedback">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-3 p-5">
              <p className="text-sm font-semibold text-stone-800">
                Feedback button states
              </p>
              <div className="flex items-center gap-4">
                <FeedbackButtons
                  rating={null}
                  onUp={() => {}}
                  onDown={() => {}}
                />
                <FeedbackButtons
                  rating="up"
                  onUp={() => {}}
                  onDown={() => {}}
                />
                <FeedbackButtons
                  rating="down"
                  onUp={() => {}}
                  onDown={() => {}}
                />
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFeedbackModalSample(true)}
              >
                Open feedback modal
              </Button>
            </Card>
          </div>
        </Section>
      </div>

      <FeedbackModal
        open={showFeedbackModalSample}
        title="Sample feedback modal"
        placeholder="Please tell us what went wrong with these tags so we can improve future tags."
        onCloseWithoutNote={() => setShowFeedbackModalSample(false)}
        onSubmit={() => setShowFeedbackModalSample(false)}
      />
    </main>
  );
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
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

const STYLE_HISTORY_ROWS = [
  {
    date: "May 8, 2026",
    title: "Sterling silver hoop earrings",
    description:
      "Lightweight hoops with a polished minimalist finish for everyday wear",
    status: "generated",
    statusClass: "bg-green-50 text-green-700",
    selected: true,
  },
  {
    date: "May 8, 2026",
    title: "Draft listing title",
    description: "Browser-only draft preview",
    status: "draft",
    statusClass: "bg-blue-50 text-blue-700",
    selected: false,
  },
  {
    date: "May 7, 2026",
    title: "Archived ceramic mug",
    description: "Hidden from normal history until archived rows are included",
    status: "archived",
    statusClass: "bg-red-50 text-red-700",
    selected: false,
  },
];
