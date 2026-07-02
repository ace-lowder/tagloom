import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("signs in seeded account and saves storage state", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_E2E_EMAIL;
  const password = process.env.PLAYWRIGHT_E2E_PASSWORD;

  if (!email || !password) {
    throw new Error("PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD are required.");
  }

  await page.goto("/login?next=/");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await expect(page.getByRole("button", { name: /Manage Plan|View Plans/ })).toBeVisible();

  await mkdir(".auth", { recursive: true });
  await page.context().storageState({ path: ".auth/tagloom.json" });
});
