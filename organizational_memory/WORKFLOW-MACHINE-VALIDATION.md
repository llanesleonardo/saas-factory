# `validate-workflow-machine` — what it checks

This note documents what `npm run validate-workflow-machine` validates, in plain terms.

- **Validator code**: `factory/validate-workflow-machine.ts`
- **Input file**: `factory/workflow-state-machine.json`

## Mermaid map (validator flow)

```mermaid
flowchart TB
  Start([npm run validate-workflow-machine]) --> Read[Read workflow-state-machine.json]
  Read --> Parse[JSON.parse]

  Parse --> CheckTop{Has required fields?}
  CheckTop -->|no| FailTop[Fail: missing/invalid\nmachine_version, states,\ntask_queue_mapping]
  CheckTop -->|yes| CheckStates{States list valid?}

  CheckStates -->|no| FailStates[Fail: states empty\nor duplicate ids]
  CheckStates -->|yes| CheckMapping{task_queue_mapping valid?}

  CheckMapping -->|no| FailMapping[Fail: missing one of\nbacklog/ready/in_progress/blocked/done\nor unknown status key\nor references unknown state]
  CheckMapping -->|yes| CheckTransitions{Transitions valid?}

  CheckTransitions -->|no| FailTransitions[Fail: transitions empty\nor from/to references\nunknown state id]
  CheckTransitions -->|yes| Ok[OK: machine internally consistent]

  FailTop --> EndFail([Exit code 1])
  FailStates --> EndFail
  FailMapping --> EndFail
  FailTransitions --> EndFail
  Ok --> EndOk([Exit code 0])
```



## Important limitation (what it does *not* check)

This validator checks that the **workflow definition file is consistent with itself**.

It does **not** yet verify that `factory/task-queue.json` tasks are “following” the workflow (that would be a separate validator comparing task statuses/metadata to workflow rules).