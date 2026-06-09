import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test.use({
  storageState: ".auth/tagloom.json",
});

test("authenticated user reaches the protected home area", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await expect(page.getByRole("button", { name: /Manage Plan|View Plans/ })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Generate Etsy tags that help shoppers find your listings/i,
    }),
  ).toBeVisible();
});

test("billing page loads for an authenticated user", async ({ page }) => {
  await page.goto("/billing");
  await expect(page.getByRole("heading", { name: "Manage your plan" })).toBeVisible();
  await expect(page.getByText("Current Plan", { exact: true })).toBeVisible();
});

test("billing actions use the real billing UI with mocked endpoints", async ({ page }) => {
  // Keep the e2e user free of stripe_customer_id: /billing can call Stripe
  // during server render before these client-side route mocks apply.
  await page.route("**/api/checkout/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: `${baseURL}/billing?checkout=success` }),
    });
  });
  await page.route("**/api/billing/portal", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: `${baseURL}/billing?portal=success` }),
    });
  });
  await page.route("**/api/billing/switch-plan", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/billing");

  const checkoutButton = page
    .getByRole("button", { name: /Start now|Start monthly|Go unlimited|Purchase generations|Change plan|Renew plan/ })
    .first();
  const checkoutRequest = page.waitForRequest("**/api/checkout/session");
  await checkoutButton.click();
  const checkout = await checkoutRequest;
  expect(checkout.method()).toBe("POST");
  await expect(page).toHaveURL(/checkout=success|portal=success/);

  const portalButton = page.getByRole("button", { name: /Cancel subscription|Renew subscription/ });
  if (await portalButton.count()) {
    const portalRequest = page.waitForRequest("**/api/billing/portal");
    await portalButton.click();
    const portal = await portalRequest;
    expect(portal.method()).toBe("POST");
    await expect(page.getByText("Could not open billing portal.")).toHaveCount(0);
  }

  const switchPlanButton = page.getByRole("button", { name: /Change plan/ }).first();
  if (await switchPlanButton.count()) {
    const switchPlanRequest = page.waitForRequest("**/api/billing/switch-plan");
    await switchPlanButton.click();
    const switchPlan = await switchPlanRequest;
    expect(switchPlan.method()).toBe("POST");
    await expect(page.getByText("Could not switch plan.")).toHaveCount(0);
  }

  await page.unroute("**/api/checkout/session");
  await page.unroute("**/api/billing/portal");
  await page.unroute("**/api/billing/switch-plan");

  await page.route("**/api/checkout/session", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Could not create checkout session." }),
    });
  });
  await page.route("**/api/billing/portal", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Could not open billing portal." }),
    });
  });
  await page.route("**/api/billing/switch-plan", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "Could not switch plan." }),
    });
  });

  await page.goto("/billing");

  const errorCheckoutButton = page
    .getByRole("button", { name: /Start now|Start monthly|Go unlimited|Purchase generations|Change plan|Renew plan/ })
    .first();
  const errorCheckoutRequest = page.waitForRequest("**/api/checkout/session");
  await errorCheckoutButton.click();
  const errorCheckout = await errorCheckoutRequest;
  expect(errorCheckout.method()).toBe("POST");
  await expect(page.getByText("Could not create checkout session.")).toBeVisible();

  const errorPortalButton = page.getByRole("button", { name: /Cancel subscription|Renew subscription/ });
  if (await errorPortalButton.count()) {
    const errorPortalRequest = page.waitForRequest("**/api/billing/portal");
    await errorPortalButton.click();
    const errorPortal = await errorPortalRequest;
    expect(errorPortal.method()).toBe("POST");
    await expect(page.getByText("Could not open billing portal.")).toBeVisible();
  }

  const errorSwitchPlanButton = page.getByRole("button", { name: /Change plan/ }).first();
  if (await errorSwitchPlanButton.count()) {
    const errorSwitchPlanRequest = page.waitForRequest("**/api/billing/switch-plan");
    await errorSwitchPlanButton.click();
    const errorSwitchPlan = await errorSwitchPlanRequest;
    expect(errorSwitchPlan.method()).toBe("POST");
    await expect(page.getByText("Could not switch plan.")).toBeVisible();
  }
});

test("generation flow exposes core generator actions", async ({ page }) => {
  await page.goto("/");
  const titleInput = page.getByPlaceholder(
    "e.g. Handmade ceramic coffee mug with minimalist design",
  );
  await titleInput.fill("Minimalist ceramic coffee mug handmade");
  await expect(titleInput).toHaveValue(/Minimalist ceramic coffee mug handmade/);
  const generatorPanel = page.getByTestId("generator-scroll-panel");
  const generateButton = generatorPanel.getByRole("button", { name: "Generate tags" });
  await generateButton.click();
  await expect(generateButton).toBeVisible();
  await expect(page.getByRole("button", { name: "Show generation history" })).toBeVisible();
});

test("homepage pricing card starts checkout for logged-in users", async ({ page }) => {
  await page.route("**/api/checkout/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: `${baseURL}/billing?checkout=success` }),
    });
  });

  await page.goto("/#pricing");
  const startNowButton = page.getByRole("button", { name: "Start now" }).first();
  const checkoutRequest = page.waitForRequest("**/api/checkout/session");
  await startNowButton.click();
  await checkoutRequest;
  await expect(page).toHaveURL(/\/billing\?checkout=success/);
});
