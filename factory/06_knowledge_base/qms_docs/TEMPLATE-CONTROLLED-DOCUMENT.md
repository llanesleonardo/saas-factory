# CONTROLLED DOCUMENT — TEMPLATE (DOCS AGENT OUTPUT)

Use for files under **`published/`**. Adjust **Doc ID** scheme in **`DOCUMENT-CONTROL.md`**.

```markdown
# <Title>

## Document control
| Field | Value |
|-------|--------|
| **Document ID** | QMS-PUB-XXX |
| **Revision** | 0.1 |
| **Status** | Draft \| Approved \| Superseded |
| **Owner (role)** | Docs / Tech writing |
| **Source records** | inbox/YYYY-MM-DD-role-task.md, … |
| **Applicable roles** | Dev, QA, … |
| **Review due** | YYYY-MM-DD or **n/a** |

## Purpose & scope
What this document covers; what is out of scope.

## References
- Spec paths, ADRs, `FACTORY-PROCESS.md`, PRs.

## Procedure / work instruction
Numbered steps. Use tables for checklists.

## Diagrams (optional)
\`\`\`mermaid
flowchart LR
  A[Step] --> B[Step]
\`\`\`

## Lessons learned & best practices
Bullets sourced from inbox records; mark **proven** vs **experimental**.

## Revision history
| Rev | Date | Author | Summary |
|-----|------|--------|---------|
| 0.1 | | Docs Agent | Initial publish from inbox |
```
