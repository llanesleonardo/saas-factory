/** BMC: Key activities — what the product does (features, priority, scope). */

export type FeatureItem = {
  id: string;
  summary: string;
  priority: "must" | "should" | "could" | "wont";
};

export type FeatureDefinition = {
  features: FeatureItem[];
  explicitNonGoals: string[];
};

export function emptyFeatureDefinition(): FeatureDefinition {
  return { features: [], explicitNonGoals: [] };
}
