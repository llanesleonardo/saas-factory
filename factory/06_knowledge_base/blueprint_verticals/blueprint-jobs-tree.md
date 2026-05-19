# Queue / Jobs Tree

Purpose: declare asynchronous execution needs (queues, workers, retries, eventing) as an independent subsystem.

## Prompts

### ◆ 1 · Job system type
- None
- In-memory queue
- Redis queue
- Managed queue (SQS / Cloud Tasks / etc.)
- Workflow engine (Temporal)

### ◆ 2 · Job patterns
- Cron only
- Background jobs
- Event-driven jobs
- Retry-heavy workflows

### ◆ 3 · Reliability
- Best effort
- At least once
- Exactly once (advanced)

## Outputs

### `jobsDetail`
Includes derived requirements:
- `requirements.needsJobQueue`
- `requirements.needsWorkerSystem`
- `requirements.needsRetrySystem`
- `requirements.needsEventBus`

