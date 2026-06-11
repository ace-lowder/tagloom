import {
  auditProductionEnvironment,
  formatProductionEnvAudit,
} from "../src/lib/envRequirements";

const audit = auditProductionEnvironment(process.env);

console.log(formatProductionEnvAudit(audit));

if (audit.missingRequired.length > 0) {
  process.exitCode = 1;
}
