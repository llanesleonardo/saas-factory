/** BMC: Key activities (quality dimension) — definition of done, QA gates, operational success. */

export type AcceptanceCriterion = {
  id: string;
  givenWhenThen: string;
  verification: string;
};

export type AcceptanceCriteriaDefinition = {
  criteria: AcceptanceCriterion[];
  slaNotes: string;
};

export function emptyAcceptanceCriteriaDefinition(): AcceptanceCriteriaDefinition {
  return { criteria: [], slaNotes: "" };
}
