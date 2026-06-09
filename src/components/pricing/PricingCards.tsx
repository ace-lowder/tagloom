"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type PricingPlanId = "single_use" | "monthly" | "yearly";

export type PricingPlan = {
  id: PricingPlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
  accent: boolean;
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "single_use",
    name: "Starter",
    price: "7",
    period: "one-time",
    description: "For trying Tagloom on a few listings.",
    features: [
      "5 tag generations",
      "Use across multiple listings",
      "Good for first tests",
    ],
    cta: "Start now",
    popular: false,
    accent: true,
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "19",
    period: "/month",
    description: "For sellers updating tags across their shop.",
    features: [
      "100 tag generations per month",
      "Save and compare past tags",
      "Priority support",
    ],
    cta: "Start monthly",
    popular: true,
    accent: false,
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "149",
    period: "/year",
    description: "For sellers testing tags across every season.",
    features: [
      "Unlimited tag generations",
      "Save and compare past tags",
      "Priority support",
      "Save more with yearly billing",
    ],
    cta: "Go unlimited",
    popular: false,
    accent: true,
  },
];

type PricingCardsProps = {
  plans?: PricingPlan[];
  onSelectPlan: (planId: PricingPlanId) => void;
  currentTier?: "monthly" | "yearly" | null;
  showCurrentPlanBadge?: boolean;
  disableCurrentPlanAction?: boolean;
  disableAllActions?: boolean;
  allowCurrentPlanAction?: boolean;
  currentPlanActionLabel?: string;
  onCurrentPlanAction?: () => void;
  isCurrentPlanActionLoading?: boolean;
  allowStarterPurchaseWithSubscription?: boolean;
  loadingPlanId?: PricingPlanId | null;
  renewingTier?: "monthly" | "yearly" | null;
  renewingLabel?: string;
};

export default function PricingCards({
  plans = PRICING_PLANS,
  onSelectPlan,
  currentTier = null,
  showCurrentPlanBadge = false,
  disableCurrentPlanAction = false,
  disableAllActions = false,
  allowCurrentPlanAction = false,
  currentPlanActionLabel = "Current plan",
  onCurrentPlanAction,
  isCurrentPlanActionLoading = false,
  allowStarterPurchaseWithSubscription = true,
  loadingPlanId = null,
  renewingTier = null,
  renewingLabel = "Renewing soon",
}: PricingCardsProps) {
  const hasCurrentSubscription = Boolean(currentTier);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const isSubscriptionPlan = plan.id === "monthly" || plan.id === "yearly";
        const isStarterPlan = plan.id === "single_use";
        const isCurrent =
          showCurrentPlanBadge &&
          hasCurrentSubscription &&
          isSubscriptionPlan &&
          currentTier === plan.id;
        const isRenewingPlan =
          Boolean(renewingTier) &&
          hasCurrentSubscription &&
          isSubscriptionPlan &&
          plan.id === renewingTier;
        const showPopularBadge =
          plan.popular && (!showCurrentPlanBadge || !hasCurrentSubscription);
        const isHighlighted = isCurrent || showPopularBadge;
        const canRunCurrentPlanAction =
          isCurrent && allowCurrentPlanAction && typeof onCurrentPlanAction === "function";
        const shouldDisableStarterWithSubscription =
          isStarterPlan &&
          hasCurrentSubscription &&
          !allowStarterPurchaseWithSubscription;
        const isPlanActionLoading = loadingPlanId === plan.id;
        const isRedirecting =
          isPlanActionLoading || (isCurrent && isCurrentPlanActionLoading);
        const disableAction =
          disableAllActions ||
          isPlanActionLoading ||
          isRenewingPlan ||
          shouldDisableStarterWithSubscription ||
          (isCurrent && isCurrentPlanActionLoading) ||
          (isCurrent && disableCurrentPlanAction && !canRunCurrentPlanAction);
        const useChangePlanLabel =
          !isCurrent && hasCurrentSubscription && isSubscriptionPlan;
        const useOrangeChangePlanStyle = useChangePlanLabel;
        const starterCtaLabel =
          isStarterPlan && hasCurrentSubscription ? "Purchase generations" : plan.cta;
        const ctaLabel = isCurrent
          ? (canRunCurrentPlanAction ? currentPlanActionLabel : "Current plan")
          : isRenewingPlan
            ? renewingLabel
          : useChangePlanLabel
            ? "Change plan"
            : starterCtaLabel;

        const buttonVariant = isHighlighted
          ? "primary"
          : plan.accent || useOrangeChangePlanStyle
            ? "secondary"
            : "ghost";

        return (
          <Card
            key={plan.id}
            className={`group relative flex h-full flex-col p-7 transition-all hover:-translate-y-1 hover:shadow-xl ${
              isHighlighted
                ? "border-2 border-orange-400 shadow-xl shadow-orange-500/10"
                : "border-stone-100 hover:border-orange-200"
            }`}
          >
            {isCurrent ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  Current Plan
                </span>
              </div>
            ) : null}
            {showPopularBadge ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="relative isolate inline-flex overflow-hidden rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  <span className="pointer-events-none absolute inset-y-0 -left-1/3 z-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-0 transition-all duration-700 group-hover:left-[110%] group-hover:opacity-100" />
                  <span className="relative z-10">Most Popular</span>
                </span>
              </div>
            ) : null}
            {isRenewingPlan ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  Renewing
                </span>
              </div>
            ) : null}
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
              {plan.name}
            </p>
            <p className="mb-4 text-sm text-stone-500">{plan.description}</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-stone-900">${plan.price}</span>
              <span className="ml-1 text-sm text-stone-400">{plan.period}</span>
            </div>
            <ul className="mb-8 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                  <span className="text-sm text-stone-600">{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              disabled={disableAction}
              isLoading={isRedirecting}
              loadingLabel="Loading"
              variant={buttonVariant}
              onClick={() =>
                canRunCurrentPlanAction ? onCurrentPlanAction() : onSelectPlan(plan.id)
              }
              className={`mt-auto w-full ${
                isHighlighted
                  ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-orange-700 disabled:hover:from-orange-500 disabled:hover:to-orange-600"
                  : plan.accent || useOrangeChangePlanStyle
                    ? "border border-orange-300 bg-orange-50 text-orange-700 hover:border-orange-500 hover:bg-orange-100 hover:text-orange-800 disabled:hover:border-orange-300 disabled:hover:bg-orange-50 disabled:hover:text-orange-700"
                    : "bg-stone-100 text-stone-800 hover:bg-stone-200 disabled:hover:bg-stone-100"
              }`}
            >
              {ctaLabel}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
