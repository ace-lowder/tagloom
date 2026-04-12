import { describe, expect, it } from "vitest";
import { needsBillingProjectionRefresh, type BillingProjectionProfile } from "./stripeBillingSync";

function profile(overrides: Partial<BillingProjectionProfile>): BillingProjectionProfile {
  return {
    id: "user_1",
    stripe_customer_id: "cus_123",
    subscription_tier: null,
    subscription_active: false,
    subscription_period_start: null,
    subscription_period_end: null,
    subscription_cancel_at: null,
    ...overrides,
  };
}

describe("needsBillingProjectionRefresh", () => {
  it("returns false without Stripe customer id", () => {
    expect(
      needsBillingProjectionRefresh(
        profile({
          stripe_customer_id: null,
          subscription_active: true,
          subscription_tier: "monthly",
        }),
      ),
    ).toBe(false);
  });

  it("returns true for active subscription missing period bounds", () => {
    expect(
      needsBillingProjectionRefresh(
        profile({
          subscription_active: true,
          subscription_tier: "monthly",
          subscription_period_start: null,
          subscription_period_end: null,
        }),
      ),
    ).toBe(true);
  });

  it("returns true for inconsistent active/tier flags", () => {
    expect(
      needsBillingProjectionRefresh(
        profile({
          subscription_active: false,
          subscription_tier: "yearly",
        }),
      ),
    ).toBe(true);
  });

  it("returns true for active profiles marked expiring to reconcile cancel_at", () => {
    expect(
      needsBillingProjectionRefresh(
        profile({
          subscription_active: true,
          subscription_tier: "monthly",
          subscription_period_start: new Date().toISOString(),
          subscription_period_end: new Date(Date.now() + 86_400_000).toISOString(),
          subscription_cancel_at: new Date(Date.now() + 86_400_000).toISOString(),
        }),
      ),
    ).toBe(true);
  });
});
