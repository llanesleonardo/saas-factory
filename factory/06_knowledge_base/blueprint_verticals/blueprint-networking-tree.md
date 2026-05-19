# API Gateway / Networking Tree

Purpose: capture edge/network controls that become critical once scaling and external APIs exist.

## Prompts
- TLS termination
- CDN
- WAF
- Rate limiting
- Webhooks
- CORS policy
- Internal vs external API exposure

## Outputs
### `networkingDetail`
Includes derived requirements:
- `requirements.needsTls`
- `requirements.needsCdn`
- `requirements.needsWaf`
- `requirements.needsRateLimiting`
- `requirements.needsWebhooks`
- `requirements.needsCorsPolicy`
- `requirements.exposesExternalApis`

