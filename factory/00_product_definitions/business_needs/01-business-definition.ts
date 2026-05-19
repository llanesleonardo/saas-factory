/** BMC: Value propositions — core value, problem solved, differentiation. */

export type BusinessDefinition = {
  valuePropositions: string[];
  problemSolved: string;
  marketDifferentiation: string;
};

export function emptyBusinessDefinition(): BusinessDefinition {
  return {
    valuePropositions: [],
    problemSolved: "",
    marketDifferentiation: "",
  };
}
