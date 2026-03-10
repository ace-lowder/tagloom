"use client";

import { useMemo, useState } from "react";
import PricingCards, { PRICING_PLANS, type PricingPlanId } from "@/components/pricing/PricingCards";

type BillingPageClientProps = {
  subscriptionActive: boolean;
  subscriptionTier: "monthly" | "yearly" | null;
  nextChargeAt: string | null;
  canManageSubscription: boolean;
};

function formatDate(isoDate: string | null) {
  if (!isoDate) return "Unavailable";

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function BillingPageClient({
  subscriptionActive,
  subscriptionTier,
  nextChargeAt,
  canManageSubscription,
}: BillingPageClientProps) {
  const [isCreatingPortalSession, setIsCreatingPortalSession] = useState(false);
  const [isCreatingCheckoutSession, setIsCreatingCheckoutSession] = useState(false);
  const [error, setError] = useState("");

  const currentPlan = useMemo(() => {
    if (!subscriptionActive || !subscriptionTier) return null;
    return PRICING_PLANS.find((plan) => plan.id === subscriptionTier) ?? null;
  }, [subscriptionActive, subscriptionTier]);

  const currentPrice = currentPlan ? `$${currentPlan.price}${currentPlan.period}` : "$0";
  const nextChargeDate = currentPlan ? formatDate(nextChargeAt) : "None";

  const onManageStripePortal = async () => {
    if (!canManageSubscription) return;

    setError("");
    setIsCreatingPortalSession(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Could not open billing portal.");
      }

      window.location.href = data.url;
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : "Could not open billing portal.");
      setIsCreatingPortalSession(false);
    }
  };

  const onSelectPlan = async (planId: PricingPlanId) => {
    setError("");
    setIsCreatingCheckoutSession(true);

    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseType: planId }),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Could not create checkout session.");
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed.");
      setIsCreatingCheckoutSession(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 px-5 pb-16 pt-28">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Current Plan</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1.5">
              <p className="text-lg font-semibold text-stone-900">
                {currentPlan ? currentPlan.name : "Free"}
              </p>
              <p className="text-sm text-stone-600">Price: {currentPrice}</p>
              <p className="text-sm text-stone-600">Next charge: {nextChargeDate}</p>
            </div>

            {currentPlan && canManageSubscription ? (
              <button
                type="button"
                onClick={onManageStripePortal}
                disabled={isCreatingPortalSession}
                className="self-start rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:border-rose-500 hover:text-rose-700 disabled:opacity-60 md:self-auto"
              >
                {isCreatingPortalSession ? "Opening..." : "Cancel subscription"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mb-14 mt-10 h-px bg-stone-200" />

        <section id="billing-pricing">
          <div className="mb-8 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600">Billing</p>
            <h1 className="mb-3 text-3xl font-bold text-stone-900 sm:text-4xl">Manage your plan</h1>
            <p className="mx-auto max-w-lg text-stone-500">
              View your current plan or change it anytime.
            </p>
          </div>

          <PricingCards
            onSelectPlan={onSelectPlan}
            currentTier={currentPlan ? subscriptionTier : null}
            showCurrentPlanBadge
            disableCurrentPlanAction
          />
        </section>

        {error ? (
          <p className="mt-4 text-center text-sm text-red-700">{error}</p>
        ) : null}
        {isCreatingCheckoutSession ? (
          <p className="mt-4 text-center text-sm text-stone-600">Redirecting to checkout...</p>
        ) : null}
      </div>
    </div>
  );
}
