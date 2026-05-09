# Mermaid — extended templates

Use these as starting points; trim nodes to fit the conversation.

## C4-style (informal) context

```mermaid
flowchart TB
  subgraph users[Users]
    U[Person]
  end
  subgraph system[System]
    S[Software system]
  end
  subgraph external[External]
    X[Third party API]
  end
  U --> S
  S --> X
```

## Sequence with alt/opt (fragments)

Mermaid sequence diagrams support `alt` / `else` / `end`:

```mermaid
sequenceDiagram
  participant C as Client
  participant S as Server
  C->>S: Request
  alt success
    S-->>C: 200 OK
  else failure
    S-->>C: 500 Error
  end
```

## Parallel / async hint

Use `par` blocks in sequence diagrams when relevant:

```mermaid
sequenceDiagram
  participant W as Worker
  participant A as Service A
  participant B as Service B
  par parallel calls
    W->>A: call A
    W->>B: call B
  end
```

## Package / module grouping (class diagram)

```mermaid
classDiagram
  namespace Core {
    class User
  }
  namespace Billing {
    class Invoice
  }
  User "1" --> "*" Invoice : owns
```

## Git graph (history)

```mermaid
gitGraph
  commit
  branch feature
  checkout feature
  commit
  checkout main
  merge feature
```

## Timeline (roadmaps)

```mermaid
timeline
  title Phases
  section Phase 1
    MVP : Core flows
  section Phase 2
    Hardening : Tests + gates
```

## Pie chart (lightweight metrics)

```mermaid
pie title Example
  "Done" : 60
  "WIP" : 30
  "Blocked" : 10
```

## Notes on tooling context

Teams often use whiteboard tools (e.g. Miro, Lucidchart, draw.io, Figma) for workshops; **for repo-backed specs**, still prefer Mermaid so the diagram versions with the PR.
