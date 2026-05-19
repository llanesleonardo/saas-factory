import type { VerticalConfig } from "./vertical-config-types.js";

export type ProductCompilerSignals = {
  multiTenancy?: "none" | "workspace-based" | "org-based";
  wantsAuth?: boolean;
  wantsEmail?: boolean;
  wantsBilling?: boolean;
  wantsAuditTrail?: boolean;
  wantsDataExport?: boolean;
  wantsDataDeletionApi?: boolean;
};

export type SystemIrSuggestions = {
  suggestedMultiTenancy?: "none" | "workspace-based" | "org-based";
  suggestedPersistence?: "none" | "lightweight" | "full";
  suggestedBillingEnabled?: boolean;
  suggestedObservability?: "none" | "standard";
};

export function compileProductIrToSignals(cfg: VerticalConfig): ProductCompilerSignals {
  const constraints = cfg.systemConstraints ?? {};
  const product = cfg.productSpec ?? {};
  const integration = cfg.integrationPlan?.integrations;

  const identityCurrent = constraints.identity?.current;
  const wantsAuth = identityCurrent !== undefined && identityCurrent !== "none";

  const tenancyType = constraints.tenancy?.tenantModel?.type;
  const multiTenancy: ProductCompilerSignals["multiTenancy"] =
    tenancyType === "workspace-based" ? "workspace-based" : tenancyType === "org-based" ? "org-based" : "none";

  const complianceEnf = constraints.complianceEnforcement ?? {};
  const wantsAuditTrail = Boolean(complianceEnf.requiresAuditTrail);
  const wantsDataExport = Boolean(complianceEnf.requiresDataExport);
  const wantsDataDeletionApi = Boolean(complianceEnf.requiresDataDeletionAPI);

  const billingText = cfg.businessModel?.billingModel ?? cfg.billingModel ?? "";
  const wantsBilling =
    integration?.payments === "stripe" ||
    /\bstripe\b/i.test(billingText) ||
    /\bsubscription\b/i.test(billingText) ||
    /\bbilled\b/i.test(billingText);

  const mvp = constraints.mvpScope;
  const wantsEmail =
    integration?.communication === "email" ||
    constraints.identity?.required?.some((x: string) => x.toLowerCase().includes("email")) === true ||
    /invite|receipt|verification|password reset/i.test(cfg.identity ?? "") ||
    /invite|receipt|verification|password reset/i.test(product.summary ?? "") ||
    /invite|receipt|verification|password reset/i.test(JSON.stringify(mvp ?? {}));

  return {
    multiTenancy,
    wantsAuth,
    wantsEmail,
    wantsBilling,
    wantsAuditTrail,
    wantsDataExport,
    wantsDataDeletionApi,
  };
}

export function compileProductIrToSystemSuggestions(cfg: VerticalConfig): SystemIrSuggestions {
  const s = compileProductIrToSignals(cfg);

  const suggestedMultiTenancy = s.multiTenancy;

  const suggestedBillingEnabled = Boolean(s.wantsBilling && suggestedMultiTenancy !== "none");

  const suggestedObservability: SystemIrSuggestions["suggestedObservability"] =
    s.wantsAuditTrail || s.wantsDataExport || s.wantsDataDeletionApi ? "standard" : "none";

  // Persistence guidance: if anything looks SaaS-y or compliance-y, assume full DB.
  const suggestedPersistence: SystemIrSuggestions["suggestedPersistence"] =
    suggestedMultiTenancy !== "none" || s.wantsBilling || s.wantsAuditTrail || s.wantsDataExport || s.wantsDataDeletionApi
      ? "full"
      : "lightweight";

  return { suggestedMultiTenancy, suggestedPersistence, suggestedBillingEnabled, suggestedObservability };
}

