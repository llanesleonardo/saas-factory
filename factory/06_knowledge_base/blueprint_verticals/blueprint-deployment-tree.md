# Deployment decision tree (manual stack wizard) — shared constraints owner

This is the **deployment-only** decision tree for the SaaS Factory blueprint system.

It exists because deployment choices impose **global constraints** that must be applied consistently to:
- frontend runtime targets
- backend runtime/framework/library choices
- DB connectivity patterns
- storage topology (NAS/cloud/mixed)

Legend:
- `◆` decision (single-select)
- `→` implies / derives
- `⛔` option not offered (incompatible)

---

## Tree (vertical)

◆ **1 · Deployment topology (where/how it runs)**  
`Local only` | `VPS (manual ops)` | `Containerized (Docker)` | `Serverless functions` | `Edge runtime` | `Static hosting (SSG export)`

◆ **1.1 · Storage topology (NAS / cloud / mixed)**  
`Local disk` | `NAS mounted volume (NFS/SMB)` | `Cloud object storage first` | `Managed block storage` | `Mixed`

Notes:
- NAS affects **both** file uploads and **file-based DBs** (SQLite/libSQL). Treat this as an **environment constraint**.
- Mixed is common: DB on managed Postgres, uploads on S3/Blob, plus NAS for internal artifacts/backups.

◆ **2 · Deployment constraints (global compatibility mode)**  
`No constraints` | `Edge-safe only` | `Serverless-safe only` | `Container-safe only`

Coupling rules (must be enforced by all other trees):

**Edge-safe only**
- Must avoid Node-only APIs and non-edge-compatible libraries.
- Backend: edge functions only, stateless only.

**Serverless-safe only**
- Stateless by default; cold starts assumed.
- Background jobs should be “future-ready” unless a managed queue is chosen.

**Container-safe only**
- Full freedom inside container; assumes build/publish pipeline.

---

## Integration points

- **Frontend**: if storage topology is cloud-first, discourage local-filesystem uploads.
- **DB**: if engine is file-based (SQLite), storage topology decides local vs NAS (and warns on production usage).
- **Files/media**: NAS can back `local-filesystem` uploads via mount paths; cloud-first implies S3/GCS/Azure Blob.

