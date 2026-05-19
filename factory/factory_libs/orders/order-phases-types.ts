/** Per-order phase roadmap (epics only — tasks live in task-queue.json). */

export type OrderPhaseStatus = "backlog" | "ready" | "in_progress" | "blocked" | "done";

/**
 * Where this epic is anchored. Tasks you spawn later should trace back here (brief/stack/SaaS vs delivery work).
 */
export type OrderPhaseBasis =
  | "business_needs"
  | "blueprint_stack"
  | "saas_baseline"
  | "delivery_surface"
  | "mixed"
  | "unspecified";

/**
 * Delivery / architecture lanes (a phase may span several). Examples: “install frontend”, “define API”.
 */
export type OrderPhaseLane =
  | "frontend"
  | "backend"
  | "api"
  | "data"
  | "auth"
  | "infra"
  | "docs"
  | "qa"
  | "integration";

export type OrderPhaseEntry = {
  id: string;
  title: string;
  status: OrderPhaseStatus;
  depends_on: string[];
  /** Primary requirement source (business needs bundle vs stack IR vs SaaS patterns vs implementation surfaces). */
  basis?: OrderPhaseBasis;
  /** Optional lanes — same epic can touch frontend + API, etc. */
  lanes?: OrderPhaseLane[];
  /** Link to a business-needs component id or path when basis is business_needs. */
  businessNeedsComponentRef?: string;
  pointers?: Record<string, string>;
};

/** Written to `factory/01_production_planning/01_02_phase_registry/<orderId>/order-phases.json`. */
export type OrderPhasesDoc = {
  schemaVersion: 1;
  orderId: string;
  productId: string;
  updatedAt: string;
  /** Where phases were copied from. `default-template` means no `phase-queue.json` entry or `PHASES.md` existed, so a built-in 6-phase SaaS plan was synthesized. */
  source: "phase-queue" | "phases_md" | "manual" | "default-template";
  notes?: string;
  phases: OrderPhaseEntry[];
};

export type OrderLifecycleStatus =
  | "intake"
  | "quoted"
  | "confirmed"
  | "scheduled"
  | "phases_defined"
  | "executing"
  | "completed"
  | "cancelled";
