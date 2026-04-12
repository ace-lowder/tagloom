"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PricingCards, { PRICING_PLANS, type PricingPlanId } from "@/components/pricing/PricingCards";

type BillingPageClientProps = {
  subscriptionActive: boolean;
  subscriptionTier: "monthly" | "yearly" | null;
  billingDateAt: string | null;
  isExpiring: boolean;
  generationsSummary: string | null;
  canManageSubscription: boolean;
  allowStarterPurchaseWithSubscription: boolean;
  pendingRenewalTier: "monthly" | "yearly" | null;
  pendingRenewalAt: string | null;
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
  billingDateAt,
  isExpiring,
  generationsSummary,
  canManageSubscription,
  allowStarterPurchaseWithSubscription,
  pendingRenewalTier,
  pendingRenewalAt,
}: BillingPageClientProps) {
  const router = useRouter();
  const [isCreatingPortalSession, setIsCreatingPortalSession] = useState(false);
  const [redirectingPlanId, setRedirectingPlanId] = useState<PricingPlanId | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pendingKey = "billing_portal_pending";
    const hasPendingPortalReturn = () => window.sessionStorage.getItem(pendingKey) === "1";
    const refreshAfterPortalReturn = () => {
      if (!hasPendingPortalReturn()) return;
      window.sessionStorage.removeItem(pendingKey);
      router.refresh();
    };

    refreshAfterPortalReturn();

    const onPageShow = () => refreshAfterPortalReturn();
    const onFocus = () => refreshAfterPortalReturn();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshAfterPortalReturn();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  const currentPlan = useMemo(() => {
    if (!subscriptionActive || !subscriptionTier) return null;
    return PRICING_PLANS.find((plan) => plan.id === subscriptionTier) ?? null;
  }, [subscriptionActive, subscriptionTier]);
  const renewingPlan = useMemo(() => {
    if (!pendingRenewalTier) return null;
    return PRICING_PLANS.find((plan) => plan.id === pendingRenewalTier) ?? null;
  }, [pendingRenewalTier]);

  const displayedPricePlan = renewingPlan ?? currentPlan;
  const currentPrice = displayedPricePlan ? `$${displayedPricePlan.price}${displayedPricePlan.period}` : "$0";
  const billingDate = currentPlan ? formatDate(billingDateAt) : "None";
  const planName = currentPlan
    ? `${currentPlan.name}${isExpiring ? " (Expiring)" : ""}`
    : "Free";
  const billingDateLabel = isExpiring ? "Expiration Date" : "Next charge";
  const portalActionLabel = isExpiring ? "Renew subscription" : "Cancel subscription";
  const renewBaseButtonClass =
    "self-start inline-flex items-center rounded-lg border border-stone-400/90 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:border-stone-500 hover:bg-stone-50 hover:text-stone-800 disabled:opacity-60 md:self-auto";
  const renewLoadingClass = isCreatingPortalSession
    ? " border-stone-500 bg-stone-50 text-stone-800"
    : "";
  const portalButtonClass = isExpiring
    ? `${renewBaseButtonClass}${renewLoadingClass}`
    : "self-start inline-flex items-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:border-rose-500 hover:text-rose-700 disabled:opacity-60 md:self-auto";
  const spinnerClass = isExpiring
    ? "h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-400 border-t-stone-800"
    : "h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600";
  const isAnyRedirecting = isCreatingPortalSession || Boolean(redirectingPlanId);
  const pendingRenewalLabel = pendingRenewalAt
    ? `Renewing on ${formatDate(pendingRenewalAt)}`
    : "Renewing soon";
  const hasPendingTierRenewal = Boolean(pendingRenewalTier && pendingRenewalTier !== subscriptionTier);
  const currentTierRenewLabel = currentPlan ? `Renew ${currentPlan.name}` : "Renew plan";

  const createPortalSessionAndRedirect = async () => {
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

    window.sessionStorage.setItem("billing_portal_pending", "1");
    window.location.href = data.url;
  };

  const onManageStripePortal = async () => {
    if (!canManageSubscription) return;

    setError("");
    setIsCreatingPortalSession(true);
    try {
      await createPortalSessionAndRedirect();
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : "Could not open billing portal.");
      setIsCreatingPortalSession(false);
    }
  };

  const onCurrentPlanCardAction = async () => {
    if (!currentPlan || !canManageSubscription) return;

    setError("");
    setRedirectingPlanId(currentPlan.id);
    try {
      await createPortalSessionAndRedirect();
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : "Could not open billing portal.");
      setRedirectingPlanId(null);
    }
  };

  const onSelectPlan = async (planId: PricingPlanId) => {
    setError("");
    setRedirectingPlanId(planId);

    try {
      const isTierSwitchRequest =
        subscriptionActive &&
        Boolean(subscriptionTier) &&
        (planId === "monthly" || planId === "yearly") &&
        subscriptionTier !== planId;

      if (isTierSwitchRequest) {
        const switchResponse = await fetch("/api/billing/switch-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetTier: planId }),
        });
        const switchData = (await switchResponse.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          code?: string;
        };

        if (!switchResponse.ok || !switchData.ok) {
          throw new Error(switchData.error || "Open Billing Portal to switch plans.");
        }

        setRedirectingPlanId(null);
        router.refresh();
        return;
      }

      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseType: planId }),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        if ((data as { requiresPortal?: boolean }).requiresPortal) {
          if (!canManageSubscription) {
            throw new Error("Open Billing Portal to switch plans.");
          }
          try {
            await createPortalSessionAndRedirect();
          } catch {
            throw new Error("Open Billing Portal to switch plans.");
          }
          return;
        }
        throw new Error(data.error || "Could not create checkout session.");
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed.");
      setRedirectingPlanId(null);
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
                {planName}
              </p>
              {generationsSummary ? (
                <p className="text-sm text-stone-600">Generations: {generationsSummary}</p>
              ) : null}
              {renewingPlan ? (
                <p className="text-sm text-stone-600">Renewing: {renewingPlan.name}</p>
              ) : null}
              <p className="text-sm text-stone-600">Price: {currentPrice}</p>
              <p className="text-sm text-stone-600">{billingDateLabel}: {billingDate}</p>
            </div>

            {currentPlan && canManageSubscription ? (
              <button
                type="button"
                onClick={onManageStripePortal}
                disabled={isAnyRedirecting}
                className={portalButtonClass}
              >
                {isCreatingPortalSession ? (
                  <span className="inline-flex items-center justify-center">
                    <span
                      aria-hidden
                      className={spinnerClass}
                    />
                    <span className="sr-only">Loading</span>
                  </span>
                ) : (
                  portalActionLabel
                )}
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
            disableAllActions={isAnyRedirecting}
            allowCurrentPlanAction={isExpiring || hasPendingTierRenewal}
            currentPlanActionLabel={hasPendingTierRenewal ? currentTierRenewLabel : "Renew plan"}
            onCurrentPlanAction={onCurrentPlanCardAction}
            isCurrentPlanActionLoading={currentPlan ? redirectingPlanId === currentPlan.id : false}
            allowStarterPurchaseWithSubscription={allowStarterPurchaseWithSubscription}
            loadingPlanId={redirectingPlanId}
            renewingTier={pendingRenewalTier}
            renewingLabel={pendingRenewalLabel}
          />
        </section>

        {error ? (
          <p className="mt-4 text-center text-sm text-red-700">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
