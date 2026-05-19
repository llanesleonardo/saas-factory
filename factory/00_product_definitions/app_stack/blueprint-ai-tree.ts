/**
 * AI capability tree (cross-cutting layer).
 *
 * Key principle:
 * - AI does NOT own DB or backend decisions.
 * - AI declares requirements; backend/DB resolve them.
 */
import { confirm, select } from "@inquirer/prompts";

export type AiUsageMode = "none" | "basic-llm" | "product-ai" | "system-ai";

export type AiCapabilityType =
  | "chat-completions"
  | "rag"
  | "embeddings-search"
  | "agent-workflows"
  | "realtime-streaming";

export type AiProviderType = "cloud-hosted" | "enterprise-cloud" | "local-model" | "multi-cloud-router";

export type AiProvider =
  | "openai-compatible"
  | "anthropic"
  | "azure-openai"
  | "aws-bedrock"
  | "vertex-ai"
  | "local-ollama"
  | "self-hosted-vllm"
  | "router";

export type AiMemoryArchitecture = "no-memory" | "session-memory" | "user-memory" | "persistent-cross-session" | "hybrid";

export type AiVectorLayer =
  | "none"
  | "in-memory-embeddings"
  | "postgres-pgvector"
  | "dedicated-vector-db"
  | "hybrid-keyword-vector";

export type AiOrchestrationPattern = "single-prompt" | "tool-using-agent" | "multi-agent" | "event-driven-pipeline";

export type AiToolingLayer = "none" | "tool-calling" | "external-apis";

export type AiPrivacyLevel = "standard" | "high-isolation" | "on-prem-required";

export type AiCostSensitivity = "low" | "medium" | "high";

export type AiLatencyNeed = "normal" | "low-latency";

export type AiThroughputNeed = "normal" | "high-throughput";

export type AiDataNeeds = {
  /** Primary source of truth for memory behavior. */
  memoryArchitecture: AiMemoryArchitecture;
  /** Retrieval requirement. */
  retrieval: "none" | "vector-search";
  /** Audit/trace requirement. */
  audit: "none" | "event-trace-storage";
};

export type AiRequirements = {
  /** Needs a vector index + retrieval endpoint/pipeline. */
  needsVectorSearch: boolean;
  /** Needs durable storage for conversation/user memory. */
  needsPersistentMemory: boolean;
  /** Needs trace/event storage (observability + audit). */
  needsEventTraceStorage: boolean;
  /** Needs streaming responses. */
  needsStreaming: boolean;
  /** Cross-cutting constraints. */
  needsLowLatency: boolean;
  needsHighThroughput: boolean;
  costSensitivity: AiCostSensitivity;
  privacyLevel: AiPrivacyLevel;
  needsDataIsolation: boolean;
  needsOnPremSupport: boolean;
  /** Agent/tooling requirements. */
  needsToolCalling: boolean;
  needsExternalAPIs: boolean;
  /** Backend subsystem requirements. */
  needsJobQueue: boolean;
  needsEventBus: boolean;
  needsWorkerSystem: boolean;
  /** Transport requirement when streaming is selected. */
  needsStreamingTransport: boolean;
};

export type AiDetail = {
  usageMode: AiUsageMode;
  capability: AiCapabilityType;
  providerType: AiProviderType;
  provider: AiProvider;
  dataNeeds: AiDataNeeds;
  vectorLayer: AiVectorLayer;
  orchestration: AiOrchestrationPattern;
  tooling: AiToolingLayer;
  latencyNeed: AiLatencyNeed;
  throughputNeed: AiThroughputNeed;
  privacyLevel: AiPrivacyLevel;
  costSensitivity: AiCostSensitivity;
  requirements: AiRequirements;
};

export function isValidAiDetail(x: unknown): x is AiDetail {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.usageMode !== "string") return false;
  if (typeof o.capability !== "string") return false;
  if (typeof o.providerType !== "string") return false;
  if (typeof o.provider !== "string") return false;
  if (o.dataNeeds === null || typeof o.dataNeeds !== "object" || Array.isArray(o.dataNeeds)) return false;
  if (typeof (o.dataNeeds as Record<string, unknown>).memoryArchitecture !== "string") return false;
  if (typeof (o.dataNeeds as Record<string, unknown>).retrieval !== "string") return false;
  if (typeof (o.dataNeeds as Record<string, unknown>).audit !== "string") return false;
  if (typeof o.vectorLayer !== "string") return false;
  if (typeof o.orchestration !== "string") return false;
  if (typeof o.tooling !== "string") return false;
  if (typeof o.latencyNeed !== "string") return false;
  if (typeof o.throughputNeed !== "string") return false;
  if (typeof o.privacyLevel !== "string") return false;
  if (typeof o.costSensitivity !== "string") return false;
  if (o.requirements === null || typeof o.requirements !== "object" || Array.isArray(o.requirements)) return false;
  return true;
}

async function pick<T extends string>(message: string, choices: { value: T; label: string }[]): Promise<T> {
  const value = await select({
    message,
    choices: choices.map((c) => ({ name: c.label, value: c.value })),
  });
  return value as T;
}

function deriveRequirements(d: Omit<AiDetail, "requirements">): AiRequirements {
  const needsStreaming = d.capability === "realtime-streaming";

  const needsVectorSearch =
    d.capability === "rag" ||
    d.capability === "embeddings-search" ||
    d.dataNeeds.retrieval === "vector-search" ||
    d.vectorLayer !== "none";

  const needsPersistentMemory =
    d.dataNeeds.memoryArchitecture === "user-memory" ||
    d.dataNeeds.memoryArchitecture === "persistent-cross-session" ||
    d.dataNeeds.memoryArchitecture === "hybrid";

  const needsEventTraceStorage = d.dataNeeds.audit === "event-trace-storage" || d.usageMode === "system-ai";

  const needsToolCalling =
    d.tooling === "tool-calling" || d.tooling === "external-apis" || d.capability === "agent-workflows";
  const needsExternalAPIs = d.tooling === "external-apis";

  const needsJobQueue =
    d.capability === "agent-workflows" || d.orchestration === "event-driven-pipeline" || d.orchestration === "multi-agent";
  const needsEventBus = d.orchestration === "event-driven-pipeline";
  const needsWorkerSystem = d.orchestration === "event-driven-pipeline" || d.orchestration === "multi-agent";

  const needsStreamingTransport = needsStreaming;

  const needsLowLatency = d.latencyNeed === "low-latency";
  const needsHighThroughput = d.throughputNeed === "high-throughput";
  const needsDataIsolation = d.privacyLevel === "high-isolation" || d.privacyLevel === "on-prem-required";
  const needsOnPremSupport = d.privacyLevel === "on-prem-required";

  return {
    needsVectorSearch,
    needsPersistentMemory,
    needsEventTraceStorage,
    needsStreaming,
    needsLowLatency,
    needsHighThroughput,
    costSensitivity: d.costSensitivity,
    privacyLevel: d.privacyLevel,
    needsDataIsolation,
    needsOnPremSupport,
    needsToolCalling,
    needsExternalAPIs,
    needsJobQueue,
    needsEventBus,
    needsWorkerSystem,
    needsStreamingTransport,
  };
}

export async function promptAiTree(opts: { depth: "easy" | "advanced" }): Promise<{ aiDetail: AiDetail } | { aiDetail?: undefined }> {
  const usageMode = await pick<AiUsageMode>("AI · 1 Usage mode", [
    { value: "none", label: "None" },
    { value: "basic-llm", label: "Basic LLM features (chat/prompts)" },
    { value: "product-ai", label: "Product AI features (user-facing AI)" },
    { value: "system-ai", label: "System AI (agents/automation)" },
  ]);

  if (usageMode === "none") return {};

  const capability =
    opts.depth === "easy"
      ? ("chat-completions" as const)
      : await pick<AiCapabilityType>("AI · 2 Capability type", [
          { value: "chat-completions", label: "Chat / completion only" },
          { value: "rag", label: "RAG (retrieval augmented generation)" },
          { value: "embeddings-search", label: "Embeddings + search" },
          { value: "agent-workflows", label: "Agent workflows (multi-step reasoning)" },
          { value: "realtime-streaming", label: "Real-time streaming AI" },
        ]);

  const providerType =
    opts.depth === "easy"
      ? ("cloud-hosted" as const)
      : await pick<AiProviderType>("AI · 3 Provider category", [
          { value: "cloud-hosted", label: "Cloud-hosted (simple API key)" },
          { value: "enterprise-cloud", label: "Enterprise cloud (Azure/AWS/GCP integrations)" },
          { value: "local-model", label: "Local / self-hosted models" },
          { value: "multi-cloud-router", label: "Multi-provider router (policy-based)" },
        ]);

  const provider =
    providerType === "cloud-hosted"
      ? await pick<AiProvider>("AI · 3.1 Provider", [
          { value: "openai-compatible", label: "OpenAI-compatible API" },
          { value: "anthropic", label: "Anthropic" },
        ])
      : providerType === "enterprise-cloud"
        ? await pick<AiProvider>("AI · 3.1 Provider", [
            { value: "azure-openai", label: "Azure OpenAI" },
            { value: "aws-bedrock", label: "AWS Bedrock" },
            { value: "vertex-ai", label: "Vertex AI" },
          ])
        : providerType === "local-model"
          ? await pick<AiProvider>("AI · 3.1 Provider", [
              { value: "local-ollama", label: "Ollama (local)" },
              { value: "self-hosted-vllm", label: "Self-hosted vLLM" },
            ])
          : ("router" as const);

  const memoryArchitecture =
    opts.depth === "easy"
      ? ("session-memory" as const)
      : await pick<AiMemoryArchitecture>("AI · 4 Memory architecture (primary)", [
          { value: "no-memory", label: "No memory" },
          { value: "session-memory", label: "Session memory" },
          { value: "user-memory", label: "User memory" },
          { value: "persistent-cross-session", label: "Persistent cross-session memory" },
          { value: "hybrid", label: "Hybrid memory system" },
        ]);

  const retrieval =
    capability === "rag" || capability === "embeddings-search"
      ? ("vector-search" as const)
      : opts.depth === "easy"
        ? ("none" as const)
        : await pick<AiDataNeeds["retrieval"]>("AI · 4.1 Retrieval need", [
            { value: "none", label: "None" },
            { value: "vector-search", label: "Vector search" },
          ]);

  const audit =
    opts.depth === "easy"
      ? usageMode === "system-ai"
        ? ("event-trace-storage" as const)
        : ("none" as const)
      : await pick<AiDataNeeds["audit"]>("AI · 4.2 Audit/trace need", [
          { value: "none", label: "None" },
          { value: "event-trace-storage", label: "Event/trace storage required" },
        ]);

  const dataNeeds: AiDataNeeds = { memoryArchitecture, retrieval, audit };

  const needsVectorSearch = retrieval === "vector-search";
  const suggestedVectorLayer: AiVectorLayer = needsVectorSearch ? "postgres-pgvector" : "none";
  let vectorLayer: AiVectorLayer = suggestedVectorLayer;
  if (opts.depth === "advanced" && needsVectorSearch) {
    const override = await confirm({ message: `Use suggested vector layer (${suggestedVectorLayer})?`, default: true });
    if (!override) {
      vectorLayer = await pick<AiVectorLayer>("AI · 5 Vector / retrieval layer (override)", [
        { value: "postgres-pgvector", label: "Postgres + pgvector" },
        { value: "dedicated-vector-db", label: "Dedicated vector DB (Pinecone/Weaviate…)" },
        { value: "hybrid-keyword-vector", label: "Hybrid search (keyword + vector)" },
        { value: "in-memory-embeddings", label: "In-memory embeddings (dev)" },
      ]);
    }
  }

  const tooling =
    opts.depth === "easy"
      ? capability === "agent-workflows"
        ? ("tool-calling" as const)
        : ("none" as const)
      : await pick<AiToolingLayer>("AI · 6 Tooling / connectivity layer", [
          { value: "none", label: "No tool calling" },
          { value: "tool-calling", label: "Tool calling (internal tools)" },
          { value: "external-apis", label: "External APIs (network calls)" },
        ]);

  const orchestration =
    opts.depth === "easy"
      ? capability === "agent-workflows"
        ? ("tool-using-agent" as const)
        : ("single-prompt" as const)
      : await pick<AiOrchestrationPattern>("AI · 7 Orchestration pattern", [
          { value: "single-prompt", label: "Single prompt flow" },
          { value: "tool-using-agent", label: "Tool-using agent" },
          { value: "multi-agent", label: "Multi-agent system" },
          { value: "event-driven-pipeline", label: "Event-driven AI pipeline" },
        ]);

  const latencyNeed =
    opts.depth === "easy" ? ("normal" as const) : await pick<AiLatencyNeed>("AI · 8 Latency need", [
      { value: "normal", label: "Normal" },
      { value: "low-latency", label: "Low latency" },
    ]);

  const throughputNeed =
    opts.depth === "easy" ? ("normal" as const) : await pick<AiThroughputNeed>("AI · 9 Throughput need", [
      { value: "normal", label: "Normal" },
      { value: "high-throughput", label: "High throughput" },
    ]);

  const privacyLevel =
    opts.depth === "easy"
      ? ("standard" as const)
      : await pick<AiPrivacyLevel>("AI · 10 Privacy level", [
          { value: "standard", label: "Standard" },
          { value: "high-isolation", label: "High isolation (data separation)" },
          { value: "on-prem-required", label: "On-prem required" },
        ]);

  const costSensitivity =
    opts.depth === "easy"
      ? ("medium" as const)
      : await pick<AiCostSensitivity>("AI · 11 Cost sensitivity", [
          { value: "low", label: "Low (optimize quality/velocity)" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High (optimize cost)" },
        ]);

  const base = {
    usageMode,
    capability,
    providerType,
    provider,
    dataNeeds,
    vectorLayer,
    orchestration,
    tooling,
    latencyNeed,
    throughputNeed,
    privacyLevel,
    costSensitivity,
  };
  const requirements = deriveRequirements(base);
  return { aiDetail: { ...base, requirements } };
}
