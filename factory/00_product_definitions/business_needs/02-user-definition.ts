/** BMC: Customer segments — personas, ICPs, tiers, B2B vs B2C. */

export type MarketSegment = "b2b" | "b2c" | "b2b2c" | "mixed";

export type UserDefinition = {
  personas: string[];
  roles: string[];
  icpSummary: string;
  userTiers: string[];
  segment: MarketSegment;
};

export function emptyUserDefinition(): UserDefinition {
  return {
    personas: [],
    roles: [],
    icpSummary: "",
    userTiers: [],
    segment: "mixed",
  };
}
