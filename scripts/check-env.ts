import { loadEnvConfig } from "@next/env";
import {
  auditProductionEnvironment,
  formatProductionEnvAudit,
} from "../src/lib/envRequirements";

loadEnvConfig(process.cwd());

const audit = auditProductionEnvironment(process.env);

console.log(formatProductionEnvAudit(audit));

if (audit.missingRequired.length > 0) {
  process.exitCode = 1;
}
