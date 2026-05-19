/** BMC: Key partnerships + key resources — external deps, infra limits, integrations. */

export type IntegrationRef = {
  system: string;
  integrationType: "oauth" | "webhook" | "batch" | "sdk" | "other";
  constraints: string[];
};

export type TechnicalConstraints = {
  thirdParties: IntegrationRef[];
  infraLimits: string[];
  complianceDrivers: string[];
};

export function emptyTechnicalConstraints(): TechnicalConstraints {
  return { thirdParties: [], infraLimits: [], complianceDrivers: [] };
}
