"use client";

import { useState } from "react";
import type { PricingPlanId } from "@/components/pricing/PricingCards";

type UsePricingActionsParams = {
  isLoggedIn: boolean;
  subscriptionActive: boolean;
  currentTier: "monthly" | "yearly" | null;
  canManageSubscription: boolean;
  onRequireAuth: () => void;
  onRefresh: () => void;
  onError: (message: string) => void;
};

export function usePricingActions({
  isLoggedIn,
  subscriptionActive,
  currentTier,
  canManageSubscription,
  onRequireAuth,
  onRefresh,
  onError,
}: UsePricingActionsParams) {
  const [isCreatingPortalSession, setIsCreatingPortalSession] = useState(false);
  const [redirectingPlanId, setRedirectingPlanId] = useState<PricingPlanId | null>(null);

  const isAnyRedirecting = isCreatingPortalSession || Boolean(redirectingPlanId);

  const createPortalSessionAndRedirect = async () => {
    const response = await fetch("/api/billing/portal", { method: "POST" });
    const data = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
    if (!response.ok || !data.url) {
      throw new Error(data.error || "Could not open billing portal.");
    }

    window.sessionStorage.setItem("billing_portal_pending", "1");
    window.location.href = data.url;
  };

  const onManagePortal = async () => {
    if (!canManageSubscription) return;
    setIsCreatingPortalSession(true);
    try {
      await createPortalSessionAndRedirect();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not open billing portal.");
      setIsCreatingPortalSession(false);
    }
  };

  const onSelectPlan = async (planId: PricingPlanId) => {
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }

    setRedirectingPlanId(planId);
    try {
      const isTierSwitchRequest =
        subscriptionActive &&
        Boolean(currentTier) &&
        (planId === "monthly" || planId === "yearly") &&
        currentTier !== planId;

      if (isTierSwitchRequest) {
        const switchResponse = await fetch("/api/billing/switch-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetTier: planId }),
        });
        const switchData = (await switchResponse.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        if (!switchResponse.ok || !switchData.ok) {
          throw new Error(switchData.error || "Open Billing Portal to switch plans.");
        }
        setRedirectingPlanId(null);
        onRefresh();
        return;
      }

      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseType: planId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        requiresPortal?: boolean;
      };

      if (!response.ok || !data.url) {
        if (data.requiresPortal) {
          if (!canManageSubscription) {
            throw new Error("Open Billing Portal to switch plans.");
          }
          await createPortalSessionAndRedirect();
          return;
        }
        throw new Error(data.error || "Could not create checkout session.");
      }

      window.location.href = data.url;
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not create checkout session.");
      setRedirectingPlanId(null);
    }
  };

  return {
    isCreatingPortalSession,
    redirectingPlanId,
    isAnyRedirecting,
    onManagePortal,
    onSelectPlan,
  };
}
