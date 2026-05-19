/**
 * API Gateway / Networking tree (cross-cutting infra edge).
 *
 * Captures external API exposure, WAF/CDN, TLS termination, webhooks, and CORS.
 */
import { checkbox, select } from "@inquirer/prompts";

export type TlsTermination = "none-dev" | "at-edge" | "at-load-balancer";
export type CdnMode = "none" | "static-only" | "full-site";
export type WafMode = "none" | "basic" | "managed";
export type RateLimitingMode = "none" | "basic" | "advanced";
export type WebhooksMode = "none" | "ingest-only" | "ingest-and-deliver";
export type ApiExposure = "internal-only" | "external-public" | "external-partner" | "mixed";

export type CorsPolicy = "none-same-origin" | "allowlist" | "wildcard-dev-only";

export type NetworkingRequirements = {
  needsTls: boolean;
  needsCdn: boolean;
  needsWaf: boolean;
  needsRateLimiting: boolean;
  needsWebhooks: boolean;
  needsCorsPolicy: boolean;
  exposesExternalApis: boolean;
};

export type NetworkingDetail = {
  apiExposure: ApiExposure;
  tls: TlsTermination;
  cdn: CdnMode;
  waf: WafMode;
  rateLimiting: RateLimitingMode;
  webhooks: WebhooksMode;
  corsPolicy: CorsPolicy;
  internalApi: { enabled: boolean; notes?: string };
  requirements: NetworkingRequirements;
};

async function pick<T extends string>(message: string, choices: { value: T; label: string }[]): Promise<T> {
  const value = await select({
    message,
    choices: choices.map((c) => ({ name: c.label, value: c.value })),
  });
  return value as T;
}

function deriveNetworkingRequirements(d: Omit<NetworkingDetail, "requirements">): NetworkingRequirements {
  const exposesExternalApis = d.apiExposure !== "internal-only";
  const needsTls = d.tls !== "none-dev" && exposesExternalApis;
  const needsCdn = d.cdn !== "none";
  const needsWaf = d.waf !== "none" && exposesExternalApis;
  const needsRateLimiting = d.rateLimiting !== "none" && exposesExternalApis;
  const needsWebhooks = d.webhooks !== "none";
  const needsCorsPolicy = exposesExternalApis || d.corsPolicy !== "none-same-origin";
  return { needsTls, needsCdn, needsWaf, needsRateLimiting, needsWebhooks, needsCorsPolicy, exposesExternalApis };
}

export async function promptNetworkingTree(opts: { depth: "easy" | "advanced" }): Promise<{ networkingDetail: NetworkingDetail }> {
  const apiExposure =
    opts.depth === "easy"
      ? ("external-public" as const)
      : await pick<ApiExposure>("Networking · 1 API exposure", [
          { value: "internal-only", label: "Internal APIs only" },
          { value: "external-public", label: "External public API" },
          { value: "external-partner", label: "External partner API (keys/contracts)" },
          { value: "mixed", label: "Mixed internal + external APIs" },
        ]);

  const tls = await pick<TlsTermination>("Networking · 2 TLS termination", [
    { value: "none-dev", label: "None / dev only" },
    { value: "at-edge", label: "At edge (CDN / gateway)" },
    { value: "at-load-balancer", label: "At load balancer / ingress" },
  ]);

  const cdn =
    opts.depth === "easy"
      ? ("static-only" as const)
      : await pick<CdnMode>("Networking · 3 CDN", [
          { value: "none", label: "None" },
          { value: "static-only", label: "Static assets only" },
          { value: "full-site", label: "Full-site CDN (incl. caching routes)" },
        ]);

  const waf =
    opts.depth === "easy"
      ? ("basic" as const)
      : await pick<WafMode>("Networking · 4 WAF", [
          { value: "none", label: "None" },
          { value: "basic", label: "Basic managed rules" },
          { value: "managed", label: "Managed WAF + custom rules" },
        ]);

  const rateLimiting =
    opts.depth === "easy"
      ? ("basic" as const)
      : await pick<RateLimitingMode>("Networking · 5 Rate limiting", [
          { value: "none", label: "None" },
          { value: "basic", label: "Basic (per IP / per user)" },
          { value: "advanced", label: "Advanced (burst + sliding window + policies)" },
        ]);

  let webhooks: WebhooksMode = "none";
  if (opts.depth !== "easy") {
    const arr = (await checkbox({
      message: "Networking · 6 Webhooks (select what you need)",
      choices: [
        { value: "none", name: "None", checked: true },
        { value: "ingest-only", name: "Ingest inbound webhooks", checked: false },
        { value: "ingest-and-deliver", name: "Ingest + deliver outbound webhooks", checked: false },
      ],
    })) as ("none" | "ingest-only" | "ingest-and-deliver")[];
    webhooks = arr.includes("ingest-and-deliver") ? "ingest-and-deliver" : arr.includes("ingest-only") ? "ingest-only" : "none";
  }

  const corsPolicy =
    opts.depth === "easy"
      ? ("allowlist" as const)
      : await pick<CorsPolicy>("Networking · 7 CORS policy", [
          { value: "none-same-origin", label: "Same-origin only" },
          { value: "allowlist", label: "Allowlist specific origins" },
          { value: "wildcard-dev-only", label: "Wildcard (dev-only)" },
        ]);

  const internalApi = { enabled: apiExposure === "internal-only" || apiExposure === "mixed" };

  const base: Omit<NetworkingDetail, "requirements"> = {
    apiExposure,
    tls,
    cdn,
    waf,
    rateLimiting,
    webhooks,
    corsPolicy,
    internalApi,
  };

  return { networkingDetail: { ...base, requirements: deriveNetworkingRequirements(base) } };
}

export function isValidNetworkingDetail(x: unknown): x is NetworkingDetail {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.apiExposure !== "string") return false;
  if (typeof o.tls !== "string") return false;
  if (typeof o.cdn !== "string") return false;
  if (typeof o.waf !== "string") return false;
  if (typeof o.rateLimiting !== "string") return false;
  if (typeof o.webhooks !== "string") return false;
  if (typeof o.corsPolicy !== "string") return false;
  if (o.internalApi === null || typeof o.internalApi !== "object" || Array.isArray(o.internalApi)) return false;
  if (o.requirements === null || typeof o.requirements !== "object" || Array.isArray(o.requirements)) return false;
  return true;
}
