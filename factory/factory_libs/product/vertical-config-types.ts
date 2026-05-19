/**
 * Shape of configs/apps/<slug>/<slug>.json — shared by generate-spec and validate-vertical-config.
 */
export type VerticalConfig = {
  vertical: string;
  displayName: string;

  /**
   * v2 grouping (preferred): split intent into logical layers that are derivable.
   * Keep legacy flat fields for backward compatibility during migration.
   */
  productSpec?: {
    summary?: string;
    positioning?: string;
    primaryUser?: string;
    secondaryUsers?: string[];
    regions?: string[];
    nonGoals?: string[];
  };

  businessModel?: {
    billingModel?: string;
    slaAndSupport?: string;
  };

  systemConstraints?: {
    compliance?: string[];
    complianceEnforcement?: {
      requiresDataDeletionAPI?: boolean;
      requiresDataExport?: boolean;
      requiresAuditTrail?: boolean;
      requiresPIIRedaction?: boolean;
    };

    dataClassification?: string;

    identity?: {
      current?: "none" | "email-password" | "oauth-only" | "hybrid-email-oauth" | "enterprise-sso";
      required?: string[];
    };
    identityRoadmap?: {
      mfa?: "future" | "not-planned";
      sso?: "enterprise-only" | "future" | "not-planned";
      magicLink?: "future" | "not-planned";
    };

    tenancy?: {
      tenantModel?: {
        type?: "none" | "workspace-based" | "org-based";
        isolation?: "row-level" | "db-per-tenant" | "schema-per-tenant";
      };
      membershipModel?: { userToWorkspace?: "one-to-one" | "one-to-many" | "many-to-many" };
      billingUnit?: string;
      notes?: string;
    };

    /** Machine-readable MVP constraints (preferred over `mvpScopeHint`). */
    mvpScope?: {
      auth?: "none" | "email-password" | "oauth-only" | "hybrid-email-oauth";
      projectLimit?: number;
      userLimit?: number;
      billing?: string;
      roles?: string[];
      features?: string[];
    };
  };

  integrationPlan?: {
    integrations?: {
      payments?: "stripe" | "none";
      communication?: "email" | "none";
      exports?: ("csv" | "pdf" | "none")[];
      sync?: ("calendar" | "crm" | "none")[];
      notes?: string;
    };
  };

  // ----- Legacy v1 flat fields (deprecated; allowed during migration) -----
  summary?: string;
  positioning?: string;
  primaryUser?: string;
  secondaryUsers?: string[];
  regions?: string[];
  compliance?: string[];
  billingModel?: string;
  integrationsWishlist?: string[];
  mvpScopeHint?: string;
  tenancy?: string;
  identity?: string;
  dataClassification?: string;
  slaAndSupport?: string;
  nonGoals?: string[];
};

