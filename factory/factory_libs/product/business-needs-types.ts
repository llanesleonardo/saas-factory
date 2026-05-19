/**
 * configs/apps/<slug>/business-needs.json — PM-facing business needs (single file).
 * Complements configs/apps/<slug>/<slug>.json (vertical brief); can be merged or kept parallel.
 */
import type { VerticalConfig } from "./vertical-config-types.js";

export type BusinessNeedsNarrative = {
  problemStatement?: string;
  goals?: string[];
  successCriteria?: string[];
  assumptions?: string[];
  risks?: string[];
};

export type BusinessNeedsDoc = {
  schemaVersion: 1;
  appSlug: string;
  generatedAt: string;
  displayName: string;
  productSpec: NonNullable<VerticalConfig["productSpec"]>;
  businessModel: NonNullable<VerticalConfig["businessModel"]>;
  integrationPlan?: VerticalConfig["integrationPlan"];
  narrative?: BusinessNeedsNarrative;
};
