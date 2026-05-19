# SaaS Factory — Agent Map (handoffs)

This diagram shows the **handoff graph** between SaaS Factory agent roles.

- Source of truth: `factory/agent-registry.json` (`next_agents`) plus the explicit `quality_gate_loop`.
- Purpose: make it obvious “who comes next” without re-reading every role file.

```mermaid
flowchart TB
  subgraph Core["Core delivery loop"]
    PM[pm] --> DEV[dev] --> QUAL[quality]
    QUAL -->|fail| FIX[fix] --> QUAL
    QUAL -->|pass| GIT[git] --> DEVOPS[devops]
  end

  subgraph Spec["Spec & planning"]
    SPECGEN[spec-generator] --> PM
    ARCH[architect] --> PM
    SPIKE[spike] --> ARCH
  end

  subgraph Specialists["Specialist reviews/support"]
    SECURITY[security] --> PM
    SECURITY --> DEV
    SECURITY --> DEVOPS

    DOCS[docs] --> TOOLING[tooling]
    DOCS --> PM

    SUPPORT[support] --> PM
    SUPPORT --> DOCS
    SUPPORT --> SECURITY
    SUPPORT --> QUAL

    FINOPS[finops] --> PM
    FINOPS --> ARCH
    FINOPS --> DEVOPS

    TOOLING --> DEV
    TOOLING --> QUAL
    TOOLING --> DEVOPS
    TOOLING --> DOCS
  end

  BUILDER[builder] --> PM
  PM --> BUILDER
```

