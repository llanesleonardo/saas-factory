/** BMC: Revenue streams + cost structure — pricing, tiers, billing, margin intent. */

export type MonetizationDefinition = {
  pricingModel: string;
  tiers: string[];
  billingTriggers: string[];
  marginTargetsNotes: string;
};

export function emptyMonetizationDefinition(): MonetizationDefinition {
  return {
    pricingModel: "",
    tiers: [],
    billingTriggers: [],
    marginTargetsNotes: "",
  };
}
