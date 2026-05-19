/**
 * Observability/SRE tree (cross-cutting capability layer).
 *
 * This goes beyond the coarse `observability` enum in the blueprint.
 */
import { checkbox, select } from "@inquirer/prompts";

export type LoggingMode = "console" | "structured-json" | "pino" | "centralized-vendor";

export type MetricsMode = "none" | "basic" | "prometheus-full";

export type TracingMode = "none" | "opentelemetry" | "vendor";

export type ErrorTracking = "none" | "sentry" | "custom";

export type PiiHandling = "none" | "redaction-enabled" | "compliance-mode";

export type ObservabilityRequirements = {
  needsTracing: boolean;
  needsMetrics: boolean;
  needsErrorTracking: boolean;
  needsPIIRedaction: boolean;
};

export type ObservabilityDetail = {
  logging: LoggingMode;
  metrics: MetricsMode;
  tracing: TracingMode;
  errorTracking: ErrorTracking;
  piiHandling: PiiHandling;
  requirements: ObservabilityRequirements;
};

async function pick<T extends string>(message: string, choices: { value: T; label: string }[]): Promise<T> {
  const value = await select({
    message,
    choices: choices.map((c) => ({ name: c.label, value: c.value })),
  });
  return value as T;
}

function deriveObsRequirements(d: Omit<ObservabilityDetail, "requirements">): ObservabilityRequirements {
  return {
    needsTracing: d.tracing !== "none",
    needsMetrics: d.metrics !== "none",
    needsErrorTracking: d.errorTracking !== "none",
    needsPIIRedaction: d.piiHandling !== "none",
  };
}

export async function promptObservabilityTree(opts: { depth: "easy" | "advanced" }): Promise<{ observabilityDetail: ObservabilityDetail }> {
  const logging =
    opts.depth === "easy"
      ? ("structured-json" as const)
      : await pick<LoggingMode>("Obs · 1 Logging", [
          { value: "console", label: "Console only" },
          { value: "structured-json", label: "Structured JSON logs" },
          { value: "pino", label: "Pino" },
          { value: "centralized-vendor", label: "Centralized logs (ELK/Datadog/etc.)" },
        ]);

  const metrics =
    opts.depth === "easy"
      ? ("basic" as const)
      : await pick<MetricsMode>("Obs · 2 Metrics", [
          { value: "none", label: "None" },
          { value: "basic", label: "Basic (CPU/memory/process)" },
          { value: "prometheus-full", label: "Full (Prometheus-style)" },
        ]);

  const tracing =
    opts.depth === "easy"
      ? ("opentelemetry" as const)
      : await pick<TracingMode>("Obs · 3 Tracing", [
          { value: "none", label: "None" },
          { value: "opentelemetry", label: "OpenTelemetry" },
          { value: "vendor", label: "Vendor tracing (Datadog/NewRelic)" },
        ]);

  const errorTracking =
    opts.depth === "easy"
      ? ("sentry" as const)
      : await pick<ErrorTracking>("Obs · 4 Error tracking", [
          { value: "none", label: "None" },
          { value: "sentry", label: "Sentry" },
          { value: "custom", label: "Custom system" },
        ]);

  const piiHandling =
    opts.depth === "easy"
      ? ("redaction-enabled" as const)
      : await pick<PiiHandling>("Obs · 5 PII handling", [
          { value: "none", label: "None" },
          { value: "redaction-enabled", label: "Redaction enabled" },
          { value: "compliance-mode", label: "Compliance mode" },
        ]);

  const base = { logging, metrics, tracing, errorTracking, piiHandling };
  return { observabilityDetail: { ...base, requirements: deriveObsRequirements(base) } };
}

export function isValidObservabilityDetail(x: unknown): x is ObservabilityDetail {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.logging !== "string") return false;
  if (typeof o.metrics !== "string") return false;
  if (typeof o.tracing !== "string") return false;
  if (typeof o.errorTracking !== "string") return false;
  if (typeof o.piiHandling !== "string") return false;
  if (o.requirements === null || typeof o.requirements !== "object" || Array.isArray(o.requirements)) return false;
  return true;
}
