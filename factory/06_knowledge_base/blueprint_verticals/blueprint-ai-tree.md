# AI decision tree (capability layer) — declares requirements

This documents the AI capability decision tree implemented in `factory/blueprint-ai-tree.ts`.

Design principle:
- AI is **not** an “AI DB tree” or “AI backend tree”.
- AI is a **capability layer** that **declares requirements**. Backend + DB + infra resolve them.

Legend:
- `◆` decision (single-select)
- `→` implies / derives
- `⛔` option not offered (incompatible)

---

## Tree (v1)

◆ **1 · AI usage mode**  
`None` | `Basic LLM features` | `Product AI (user-facing)` | `System AI (agents/automation)`

◆ **2 · Capability type**  
`Chat/completions` | `RAG` | `Embeddings + search` | `Agent workflows` | `Real-time streaming`

◆ **3 · Provider category**  
`Cloud-hosted` | `Enterprise cloud` | `Local/self-hosted` | `Multi-cloud router`

◆ **3.1 · Provider** (depends on category)  
Examples: `OpenAI-compatible`, `Anthropic`, `Azure OpenAI`, `AWS Bedrock`, `Vertex AI`, `Ollama`, `vLLM`

◆ **4 · AI data needs (one primary source of truth)**  
AI no longer has two overlapping “truth sources” for memory. We use:

- **Memory architecture** (primary)
- Retrieval need
- Audit/trace need

◆ **4.1 · Memory architecture**  
`No memory` | `Session memory` | `User memory` | `Persistent cross-session` | `Hybrid`

◆ **4.2 · Retrieval need**  
`None` | `Vector search`

◆ **4.3 · Audit/trace need**  
`None` | `Event/trace storage`

◆ **5 · Vector / retrieval layer** (only if retrieval = vector search)  
Deterministic UX:
- System suggests a default (typically `Postgres+pgvector`)
- In advanced mode the user can explicitly override

Options: `Postgres+pgvector` | `Dedicated vector DB` | `Hybrid keyword+vector` | `In-memory embeddings (dev)`

◆ **6 · Orchestration pattern**  
`Single prompt` | `Tool-using agent` | `Multi-agent` | `Event-driven pipeline`

◆ **6.1 · Tooling / connectivity layer**  
`None` | `Tool calling` | `External APIs`

◆ **7 · Latency need**  
`Normal` | `Low latency`

◆ **8 · Throughput need**  
`Normal` | `High throughput`

◆ **9 · Privacy level**  
`Standard` | `High isolation` | `On-prem required`

◆ **10 · Cost sensitivity**  
`Low` | `Medium` | `High`

---

## Output integration

The AI tree writes:

- **`aiDetail`** (rich capture) including a computed `requirements` object:
  - `needsVectorSearch`
  - `needsPersistentMemory`
  - `needsEventTraceStorage`
  - `needsStreaming`
  - `needsToolCalling`, `needsExternalAPIs`
  - `needsJobQueue`, `needsEventBus`, `needsWorkerSystem`
  - `needsStreamingTransport`
  - privacy/latency/throughput/cost constraints

It also writes a **coarse** compatibility block:

- **`ai`**: `{ integration, usagePattern }` (kept for backwards compatibility with current scaffold conventions).

---

## How other subsystems should use AI requirements

- If `needsVectorSearch` → DB tree should offer/guide vector storage options (pgvector vs dedicated vector DB).
- If `needsPersistentMemory` → DB must have some persistence mode beyond stateless.
- If `needsEventTraceStorage` → observability/log storage should not be “none”.
- If `needsStreaming` → backend/runtime must support streaming responses and client must support streaming UX.
- If `needsJobQueue` / `needsWorkerSystem` → backend subsystem must include a worker/job execution model (even if future-ready).

