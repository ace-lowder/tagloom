import { loadEnvConfig } from "@next/env";
import Stripe from "stripe";

loadEnvConfig(process.cwd());

type ExpectedPrice = {
  label: string;
  envKey: string;
  productName: string;
  amount: number;
  currency: string;
  type: Stripe.Price.Type;
  interval: Stripe.Price.Recurring.Interval | null;
};

type PriceSummary = {
  id: string;
  active: boolean;
  amount: number | null;
  currency: string | null;
  type: Stripe.Price.Type;
  interval: Stripe.Price.Recurring.Interval | null;
  intervalCount: number | null;
  productName: string | null;
  productActive: boolean | null;
};

type StripeProductLike = {
  name?: string;
  active?: boolean;
  deleted?: boolean;
};

const EXPECTED_PRICES: ExpectedPrice[] = [
  {
    label: "Starter",
    envKey: "STRIPE_SINGLE_USE_PRICE_ID",
    productName: "Tagloom Single",
    amount: 700,
    currency: "usd",
    type: "one_time",
    interval: null,
  },
  {
    label: "Monthly",
    envKey: "STRIPE_MONTHLY_PRICE_ID",
    productName: "Tagloom Monthly",
    amount: 1900,
    currency: "usd",
    type: "recurring",
    interval: "month",
  },
  {
    label: "Yearly",
    envKey: "STRIPE_YEARLY_PRICE_ID",
    productName: "Tagloom Yearly",
    amount: 14900,
    currency: "usd",
    type: "recurring",
    interval: "year",
  },
];

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isStripeProduct(product: unknown): product is StripeProductLike {
  return Boolean(
    product &&
      typeof product === "object" &&
      !("deleted" in product) &&
      "name" in product &&
      "active" in product,
  );
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null || !currency) return "unknown";
  return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;
}

function describeInterval(type: Stripe.Price.Type, interval: Stripe.Price.Recurring.Interval | null) {
  if (type === "one_time") return "one-time";
  if (!interval) return "recurring";
  return `recurring ${interval}`;
}

function assertMatch(expected: ExpectedPrice, actual: PriceSummary) {
  const mismatches: string[] = [];

  if (!actual.active) mismatches.push("inactive");
  if (actual.amount !== expected.amount) {
    mismatches.push(`amount ${formatAmount(actual.amount, actual.currency)} != USD ${(expected.amount / 100).toFixed(2)}`);
  }
  if ((actual.currency ?? "").toLowerCase() !== expected.currency) {
    mismatches.push(`currency ${actual.currency ?? "unknown"} != ${expected.currency.toUpperCase()}`);
  }
  if (actual.type !== expected.type) {
    mismatches.push(`type ${actual.type} != ${expected.type}`);
  }
  if (actual.interval !== expected.interval) {
    mismatches.push(`interval ${actual.interval ?? "none"} != ${expected.interval ?? "none"}`);
  }
  if (actual.productName !== expected.productName) {
    mismatches.push(`product ${actual.productName ?? "unknown"} != ${expected.productName}`);
  }
  if (actual.productActive === false) {
    mismatches.push("product inactive");
  }

  return mismatches;
}

async function main() {
  const secretKey = requireEnv("STRIPE_SECRET_KEY");
  const stripe = new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover",
  });

  const summaries: Array<{ expected: ExpectedPrice; actual: PriceSummary; mismatches: string[] }> = [];

  for (const expected of EXPECTED_PRICES) {
    const priceId = requireEnv(expected.envKey);
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    const product = isStripeProduct(price.product) ? price.product : null;

    const actual: PriceSummary = {
      id: price.id,
      active: price.active,
      amount: price.unit_amount,
      currency: price.currency,
      type: price.type,
      interval: price.recurring?.interval ?? null,
      intervalCount: price.recurring?.interval_count ?? null,
      productName: product?.name ?? null,
      productActive: product?.active ?? null,
    };

    summaries.push({ expected, actual, mismatches: assertMatch(expected, actual) });
  }

  const failures = summaries.filter((entry) => entry.mismatches.length > 0);

  for (const { expected, actual } of summaries) {
    console.log(
      `${expected.label}: ${actual.id} ${actual.active ? "active" : "inactive"}, ${actual.productName ?? "unknown"} ${formatAmount(actual.amount, actual.currency)} ${describeInterval(actual.type, actual.interval)}`,
    );
  }

  if (failures.length > 0) {
    console.error("");
    console.error("Stripe price configuration does not match the expected plan setup.");
    for (const { expected, actual, mismatches } of failures) {
      console.error(`- ${expected.label} (${actual.id}): ${mismatches.join("; ")}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("Stripe price configuration matches the expected plan setup.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
