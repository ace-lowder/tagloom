import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Load Playwright-only credentials from .env.test.local/.env.test/.env.
// Restore NODE_ENV afterward so `npm run dev` still uses the normal Next dev env.
const originalNodeEnv = process.env.NODE_ENV;
const mutableProcessEnv = process.env as Record<string, string | undefined>;
mutableProcessEnv.NODE_ENV = "test";
loadEnvConfig(process.cwd(), false, console, true);
if (originalNodeEnv === undefined) {
  delete mutableProcessEnv.NODE_ENV;
} else {
  mutableProcessEnv.NODE_ENV = originalNodeEnv;
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const webServerEnv: Record<string, string> = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  ),
);
webServerEnv.NODE_ENV = "development";
delete webServerEnv.__NEXT_PROCESSED_ENV;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    env: webServerEnv,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup"],
    },
  ],
});
