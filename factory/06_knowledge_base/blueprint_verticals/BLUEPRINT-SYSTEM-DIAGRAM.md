## SaaS Factory — Blueprint flows diagrams

This explains how **`npm run mfg -- app stack -- <app>`** produces **System IR** (`configs/apps/<app>/app.stack.json`) in multiple ways.

```mermaid
flowchart LR
  U["User runs\nnpm run mfg -- app stack -- <app>"] --> M{"Select onboarding mode"}
  M -->|Proven stacks| P["Preset picker"]
  M -->|Resolver-based flow| R["Resolver-based flow\n(≤10 intent questions)"]
  M -->|Advanced| A["Advanced decision trees\n(full control)"]

  P --> SYS["System IR\nconfigs/apps/<app>/app.stack.json"]
  R --> SYS
  A --> SYS

  SYS --> S["Scaffold / generators\n(mfg app scaffold, templates, CI, infra)"]
```

### Mode: Proven stacks

```mermaid
flowchart LR
  U["User"] --> P["Choose preset\n(startup-spa / next-fullstack / …)"]
  P --> B["Preset blueprint builder\n(fills all detail blocks)"]
  B --> SYS["System IR\nconfigs/apps/<app>/app.stack.json"]
  SYS --> S["Scaffold / generators"]
```

### Mode: Resolver-based flow (Product IR → Compiler → System IR → scaffold)

```mermaid
flowchart LR
  subgraph ProductIR["Product IR\nconfigs/apps/<app>/<app>.json (optional but recommended)"]
    PS["productSpec"]
    BM["businessModel"]
    SC["systemConstraints\n(tenancy, identity, complianceEnforcement, mvpScope)"]
    IP["integrationPlan"]
  end

  subgraph Compiler["Compiler (defaults + suggestions)"]
    C["compileProductIrToSystemSuggestions()"]
  end

  subgraph Resolver["Resolver-based flow"]
    Q["≤10 intent prompts\n(frontend shape, transport,\n persistence, tenancy,\n AI usage, billing?, obs posture)"]
    R["Resolver\n(infer detail blocks + requirements)"]
  end

  ProductIR --> C --> Q
  Q --> R --> SYS["System IR\nconfigs/apps/<app>/app.stack.json"]
  SYS --> S["Scaffold / generators"]
```

### Mode: Advanced decision trees

```mermaid
flowchart LR
  U["User"] --> T["Full interactive trees\n(frontend → backend → data → auth/jobs/obs → …)"]
  T --> SYS["System IR\nconfigs/apps/<app>/app.stack.json"]
  SYS --> S["Scaffold / generators"]
```

