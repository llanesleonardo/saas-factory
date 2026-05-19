/**
 * Output of `mfg app quote` — inputs for a future pricing / quoting engine.
 */
export type ManufacturingTier = "verified-repeat" | "first-manufacture" | "unverified-returning";

export type AppQuoteBundle = {
  quoteVersion: 1;
  appSlug: string;
  generatedAt: string;
  manufacturing: {
    tier: ManufacturingTier;
    onVerifiedRegistry: boolean;
    verifiedAt?: string;
    /** True when the app has never been promoted to verified-apps.json yet (initial manufacture / quote). */
    firstManufacture: boolean;
    /** apps/<slug>/<slug>-instance (new) or apps/<slug>-instance (legacy) exists on disk */
    scaffoldedInstancePresent: boolean;
  };
  artifacts: {
    verticalBrief: { relativePath: string; present: boolean };
    businessNeeds: { relativePath: string; present: boolean };
    appStack: { relativePath: string; present: boolean };
  };
  briefSummary?: {
    displayName?: string;
    summaryOneLiner?: string;
    billingModelSnippet?: string;
  };
  businessNeedsSummary?: {
    displayName?: string;
    billingModelSnippet?: string;
    paymentsIntent?: string;
  };
  stackSummary?: {
    integrationMode?: string;
    frontendStack?: string;
    backendRuntime?: string;
    database?: string;
    redis?: string;
    cicd?: string;
    observability?: string;
  };
  saasAlignment?: {
    ok: boolean;
    errorCount: number;
    warnCount: number;
  };
  pricing: {
    engine: "placeholder";
    message: string;
  };
};
