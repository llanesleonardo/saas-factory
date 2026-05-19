/** BMC: Channels (delivery layer) — environments, regions, release strategy, GTM path. */

export type DeploymentDefinition = {
  environments: string[];
  regions: string[];
  releaseStrategy: string;
  goToMarketPath: string;
};

export function emptyDeploymentDefinition(): DeploymentDefinition {
  return {
    environments: [],
    regions: [],
    releaseStrategy: "",
    goToMarketPath: "",
  };
}
