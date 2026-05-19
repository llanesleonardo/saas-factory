# Identity / Auth Tree

Purpose: capture identity + session architecture without leaking DB details. This tree emits **requirements** that other subsystems resolve.

## Prompts

### ◆ 1 · Identity model
- None
- Email/password
- OAuth-only
- Hybrid (email + OAuth)
- Enterprise SSO (SAML/OIDC)

### ◆ 2 · Session model
- Stateless JWT
- Server sessions
- Redis sessions
- Edge sessions (sketch)

### ◆ 3 · Multi-tenancy
- None
- Org-based
- Workspace-based
- Enterprise tenant isolation

### ◆ 4 · Security features
- MFA
- Email verification
- RBAC
- Audit logs

## Outputs

### `authDetail`
Contains the selections plus derived requirements:
- `requirements.needsAuth`
- `requirements.needsSessionStore`
- `requirements.needsEmailSystem`
- `requirements.needsAuditLog`
- `requirements.needsMultiTenantDB`

### `authSystem` (coarse)
Maintained for backwards compatibility with older scaffolding:
- `none | session | jwt | oauth | hybrid`

