/**
 * Identity/Auth tree (cross-cutting capability layer).
 *
 * Outputs requirements that backend/DB/UX can consume.
 */
import { checkbox, select } from "@inquirer/prompts";

export type IdentityModel =
  | "none"
  | "email-password"
  | "oauth-only"
  | "hybrid-email-oauth"
  | "enterprise-sso-saml-oidc";

export type SessionModel = "stateless-jwt" | "server-sessions" | "redis-sessions" | "edge-sessions";

export type MultiTenancyModel = "none" | "org-based" | "workspace-based" | "enterprise-tenant-isolation";

export type SecurityFeature = "mfa" | "email-verification" | "rbac" | "audit-logs";

export type AuthRequirements = {
  needsAuth: boolean;
  needsSessionStore: boolean;
  needsEmailSystem: boolean;
  needsAuditLog: boolean;
  needsMultiTenantDB: boolean;
};

export type AuthDetail = {
  identityModel: IdentityModel;
  sessionModel: SessionModel;
  multiTenancy: MultiTenancyModel;
  securityFeatures: SecurityFeature[];
  requirements: AuthRequirements;
};

async function pick<T extends string>(message: string, choices: { value: T; label: string }[]): Promise<T> {
  const value = await select({
    message,
    choices: choices.map((c) => ({ name: c.label, value: c.value })),
  });
  return value as T;
}

function deriveAuthRequirements(d: Omit<AuthDetail, "requirements">): AuthRequirements {
  const needsAuth = d.identityModel !== "none";
  const needsEmailSystem =
    d.identityModel === "email-password" ||
    d.identityModel === "hybrid-email-oauth" ||
    d.securityFeatures.includes("email-verification");
  const needsSessionStore = d.sessionModel === "server-sessions" || d.sessionModel === "redis-sessions";
  const needsAuditLog = d.securityFeatures.includes("audit-logs");
  const needsMultiTenantDB = d.multiTenancy !== "none";
  return { needsAuth, needsSessionStore, needsEmailSystem, needsAuditLog, needsMultiTenantDB };
}

export async function promptAuthTree(opts: { depth: "easy" | "advanced" }): Promise<{ authDetail?: AuthDetail }> {
  const identityModel = await pick<IdentityModel>("Auth · 1 Identity model", [
    { value: "none", label: "None" },
    { value: "email-password", label: "Email/password" },
    { value: "oauth-only", label: "OAuth-only" },
    { value: "hybrid-email-oauth", label: "Hybrid (email + OAuth)" },
    { value: "enterprise-sso-saml-oidc", label: "Enterprise SSO (SAML/OIDC)" },
  ]);

  if (identityModel === "none") return {};

  const sessionModel =
    opts.depth === "easy"
      ? ("stateless-jwt" as const)
      : await pick<SessionModel>("Auth · 2 Session model", [
          { value: "stateless-jwt", label: "Stateless JWT" },
          { value: "server-sessions", label: "Server sessions" },
          { value: "redis-sessions", label: "Redis sessions" },
          { value: "edge-sessions", label: "Edge sessions (sketch)" },
        ]);

  const multiTenancy =
    opts.depth === "easy"
      ? ("workspace-based" as const)
      : await pick<MultiTenancyModel>("Auth · 3 Multi-tenancy", [
          { value: "none", label: "None" },
          { value: "org-based", label: "Org-based" },
          { value: "workspace-based", label: "Workspace-based" },
          { value: "enterprise-tenant-isolation", label: "Enterprise tenant isolation" },
        ]);

  const securityFeatures =
    opts.depth === "easy"
      ? (["email-verification", "rbac"] as SecurityFeature[])
      : ((await checkbox({
          message: "Auth · 4 Security features",
          choices: [
            { value: "mfa", name: "MFA", checked: false },
            { value: "email-verification", name: "Email verification", checked: true },
            { value: "rbac", name: "RBAC", checked: true },
            { value: "audit-logs", name: "Audit logs", checked: false },
          ],
        })) as SecurityFeature[]);

  const base = { identityModel, sessionModel, multiTenancy, securityFeatures };
  const requirements = deriveAuthRequirements(base);
  return { authDetail: { ...base, requirements } };
}

export function isValidAuthDetail(x: unknown): x is AuthDetail {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.identityModel !== "string") return false;
  if (typeof o.sessionModel !== "string") return false;
  if (typeof o.multiTenancy !== "string") return false;
  if (!Array.isArray(o.securityFeatures)) return false;
  if (o.requirements === null || typeof o.requirements !== "object" || Array.isArray(o.requirements)) return false;
  return true;
}
