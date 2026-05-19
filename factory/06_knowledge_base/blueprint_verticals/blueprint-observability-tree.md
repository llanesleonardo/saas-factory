# Observability / SRE Tree

Purpose: define a realistic observability posture beyond a single `observability` enum. This tree emits requirements used by generators and infra choices.

## Prompts

### ◆ 1 · Logging
- Console
- Structured logs
- Pino
- Centralized logs (ELK / Datadog)

### ◆ 2 · Metrics
- None
- Basic (CPU/memory/process)
- Full (Prometheus)

### ◆ 3 · Tracing
- None
- OpenTelemetry
- Vendor tracing (Datadog/NewRelic)

### ◆ 4 · Error tracking
- None
- Sentry
- Custom system

### ◆ 5 · PII handling
- None
- Redaction enabled
- Compliance mode

## Outputs

### `observabilityDetail`
Includes derived requirements:
- `requirements.needsTracing`
- `requirements.needsMetrics`
- `requirements.needsErrorTracking`
- `requirements.needsPIIRedaction`

### `observability` (coarse)
Still kept for backwards compatibility (`none | sentry-client-sketch | otel-hooks`).

