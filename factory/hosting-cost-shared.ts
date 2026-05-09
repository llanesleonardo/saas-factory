export type ProviderId = "aws" | "azure" | "gcp" | "digitalocean";
export type AppSize = "tiny" | "small" | "medium";

export type HostingCostEstimate = {
  app: string;
  provider: ProviderId;
  size: AppSize;
  currency: "USD";
  monthly_usd: number;
  breakdown: Array<{ line_item: string; monthly_usd: number; note?: string }>;
  excludes: string[];
  sources: Array<{ provider: ProviderId; note: string }>;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Baseline “cheapest realistic” compute-only monthly costs (USD), as of 2026.
// These are intentionally conservative and exclude databases, storage, egress overages, managed add-ons, etc.
const BASELINES: Record<ProviderId, { tiny: number; small: number; medium: number; note: string }> = {
  aws: {
    // Lightsail: $3.50 IPv6-only exists, but most apps need IPv4/internet access; use $5 as baseline.
    tiny: 5,
    small: 7,
    medium: 10,
    note: "AWS Lightsail bundles (compute-only baseline).",
  },
  azure: {
    tiny: 7.59,
    small: 10,
    medium: 15,
    note: "Azure Standard_B1s on-demand baseline (compute-only).",
  },
  gcp: {
    tiny: 6.11,
    small: 8,
    medium: 12,
    note: "GCP Compute Engine e2-micro on-demand baseline (compute-only).",
  },
  digitalocean: {
    tiny: 4,
    small: 6,
    medium: 12,
    note: "DigitalOcean Droplet baseline (compute-only).",
  },
};

export function estimateHostingBaseline(app: string, provider: ProviderId, size: AppSize): HostingCostEstimate {
  const base = BASELINES[provider][size];
  const breakdown = [{ line_item: "baseline_compute", monthly_usd: base, note: BASELINES[provider].note }];
  const monthly = base;

  const excludes = [
    "managed database (Postgres/MySQL)",
    "object storage / backups / snapshots",
    "CDN, DNS, TLS certificates",
    "data egress overages",
    "monitoring/telemetry vendors",
    "build minutes / CI usage",
  ];

  const sources: HostingCostEstimate["sources"] = [
    { provider: "aws", note: "AWS Lightsail pricing page (2026 baseline $5 plan commonly used for IPv4)." },
    { provider: "azure", note: "Azure Standard_B1s public pricing references (2026 baseline ~$7.59/mo on-demand)." },
    { provider: "gcp", note: "GCP e2-micro public pricing references (2026 baseline ~$6.11/mo on-demand)." },
    { provider: "digitalocean", note: "DigitalOcean Droplet pricing page (2026 baseline $4–$6 small droplets)." },
  ];

  return {
    app,
    provider,
    size,
    currency: "USD",
    monthly_usd: round2(monthly),
    breakdown: breakdown.map((b) => ({ ...b, monthly_usd: round2(b.monthly_usd) })),
    excludes,
    sources,
  };
}

