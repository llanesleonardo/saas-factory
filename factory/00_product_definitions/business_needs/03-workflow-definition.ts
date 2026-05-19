/** BMC: Customer relationships + channels — interaction, onboarding, touchpoints. */

export type WorkflowDefinition = {
  relationshipModel: string;
  onboardingFlow: string[];
  touchpoints: string[];
  deliveryChannels: string[];
};

export function emptyWorkflowDefinition(): WorkflowDefinition {
  return {
    relationshipModel: "",
    onboardingFlow: [],
    touchpoints: [],
    deliveryChannels: [],
  };
}
