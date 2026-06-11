import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ENV_REQUIREMENTS,
  auditProductionEnvironment,
  formatProductionEnvAudit,
} from "./envRequirements";

describe("production environment audit", () => {
  it("flags missing production-required variables", () => {
    const audit = auditProductionEnvironment({});

    expect(audit.missingRequired.map((requirement) => requirement.key)).toContain(
      "NEXT_PUBLIC_SUPABASE_URL",
    );
    expect(audit.missingRequired.map((requirement) => requirement.key)).toContain(
      "STRIPE_WEBHOOK_SECRET",
    );
    expect(audit.missingRequired.map((requirement) => requirement.key)).toContain(
      "RESEND_API_KEY",
    );
  });

  it("does not treat local Playwright variables as production recommendations", () => {
    const audit = auditProductionEnvironment({});

    expect(audit.missingRecommended.map((requirement) => requirement.key)).not.toContain(
      "PLAYWRIGHT_E2E_EMAIL",
    );
  });

  it("formats a concise operator-facing report", () => {
    const audit = auditProductionEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    });

    expect(formatProductionEnvAudit(audit)).toContain(
      "Tagloom production environment audit",
    );
    expect(formatProductionEnvAudit(audit)).toContain(
      "Missing required production variables:",
    );
  });

  it(".env.example documents every audited variable", () => {
    const example = readFileSync(".env.example", "utf8");
    const documentedKeys = new Set(
      example
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => line.split("=")[0])
        .filter(Boolean),
    );

    const missingFromExample = ENV_REQUIREMENTS
      .map((requirement) => requirement.key)
      .filter((key) => !documentedKeys.has(key));

    expect(missingFromExample).toEqual([]);
  });
});
