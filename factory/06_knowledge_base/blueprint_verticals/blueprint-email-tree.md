# Email / Comms Tree

Purpose: configure transactional email, templates, and delivery mechanism. Emits job queue dependency.

## Gating
Ask when:
- auth requires email (verification/password reset), or
- billing/SaaS exists

## Prompts
- Enable transactional email?
- Provider (Resend/SendGrid/SES/Mailgun/TBD)
- Templates (provider templates vs code templates)
- Delivery (async queue vs sync dev-only)

## Outputs
### `emailDetail`
Includes derived requirements:
- `requirements.needsEmailSystem`
- `requirements.needsTemplates`
- `requirements.needsJobQueue`

