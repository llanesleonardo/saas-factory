export type TenantRole = "owner" | "member";

export type AuthUser = {
  userId: string;
};

export type TenantMembership = {
  tenantId: string;
  userId: string;
  role: TenantRole;
};

export type AuthContext = {
  user: AuthUser | null;
  memberships: TenantMembership[];
};

export type RequireTenantMembershipOptions = {
  tenantId: string;
  requireRole?: TenantRole;
};

export type AuthErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function requireUser(ctx: AuthContext): AuthUser {
  if (!ctx.user) throw new AuthError("UNAUTHENTICATED", "User must be authenticated.");
  return ctx.user;
}

export function hasRole(member: TenantMembership, role: TenantRole): boolean {
  if (role === "member") return member.role === "member" || member.role === "owner";
  return member.role === role;
}

export function requireTenantMembership(
  ctx: AuthContext,
  opts: RequireTenantMembershipOptions,
): TenantMembership {
  const user = requireUser(ctx);
  const m = ctx.memberships.find((x) => x.tenantId === opts.tenantId && x.userId === user.userId);
  if (!m) throw new AuthError("FORBIDDEN", "User is not a member of this tenant.");
  if (opts.requireRole && !hasRole(m, opts.requireRole)) {
    throw new AuthError("FORBIDDEN", `User lacks required role: ${opts.requireRole}.`);
  }
  return m;
}

