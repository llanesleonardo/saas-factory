# Payments / Billing Tree

Purpose: describe billing/payments needs (subscriptions, usage), and emit dependencies (webhooks, jobs, audit).

## Gating
Should only be asked when SaaS signals exist (typically multi-tenancy).

## Prompts
- Enable billing?
- Provider (Stripe / TBD)
- Billing mode (subscriptions / usage / hybrid)
- Webhook ingestion (required if enabled)

## Outputs
### `billingDetail`
Includes derived requirements:
- `requirements.needsPayments`
- `requirements.needsBillingWebhooks`
- `requirements.needsUsageMetering`
- `requirements.needsSubscriptions`
- `requirements.needsJobQueue`
- `requirements.needsAuditLog`

