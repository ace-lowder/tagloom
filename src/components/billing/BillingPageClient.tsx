"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toastMessages } from "@/components/toasts/toastMessages";
import { useToast } from "@/components/toasts/toasts";
import { Button } from "@/components/ui/button";
import PricingCards, { PRICING_PLANS } from "@/components/pricing/PricingCards";
import { usePricingActions } from "@/components/pricing/usePricingActions";

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
  const { showToast } = useToast();

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

  const { isCreatingPortalSession, redirectingPlanId, isAnyRedirecting, onManagePortal, onSelectPlan } =
    usePricingActions({
      isLoggedIn: true,
      subscriptionActive,
      currentTier: subscriptionTier,
      canManageSubscription,
      onRequireAuth: () => {},
      onRefresh: () => router.refresh(),
      onError: (message) =>
        showToast({
          ...toastMessages.checkoutFailed,
          body: message,
        }),
    });
  const displayedPricePlan = renewingPlan ?? currentPlan;
  const currentPrice = displayedPricePlan ? `$${displayedPricePlan.price}${displayedPricePlan.period}` : null;
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
  const pendingRenewalLabel = pendingRenewalAt
    ? `Renewing on ${formatDate(pendingRenewalAt)}`
    : "Renewing soon";
  const hasPendingTierRenewal = Boolean(pendingRenewalTier && pendingRenewalTier !== subscriptionTier);
  const currentTierRenewLabel = currentPlan ? `Renew ${currentPlan.name}` : "Renew plan";
  const onCurrentPlanCardAction = onManagePortal;

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
              {currentPrice ? <p className="text-sm text-stone-600">Price: {currentPrice}</p> : null}
              {currentPlan ? (
                <p className="text-sm text-stone-600">{billingDateLabel}: {billingDate}</p>
              ) : null}
            </div>

            {currentPlan && canManageSubscription ? (
              <Button
                type="button"
                onClick={onManagePortal}
                disabled={isAnyRedirecting}
                variant={isExpiring ? "secondary" : "danger"}
                size="sm"
                isLoading={isCreatingPortalSession}
                loadingLabel="Loading"
                className={portalButtonClass}
              >
                {portalActionLabel}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mb-14 mt-10 h-px bg-stone-200" />

        <section id="billing-pricing">
          <div className="mb-8 text-center">
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
      </div>
    </div>
  );
}
