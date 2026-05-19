import type { AppQuoteBundle } from "./app-quote-types.js";

/** Written to `factory/01_production_planning/01_00_work_orders/<orderId>/sales-order.json`. */
export type SalesOrderDoc = {
  schemaVersion: 1;
  salesOrderId: string;
  appSlug: string;
  status: "draft" | "confirmed" | "cancelled";
  createdAt: string;
  /** Full quote bundle at time of sale (inputs for pricing / manufacturing). */
  quoteSnapshot: AppQuoteBundle;
  /** What the client committed to for this sale (filtered from full quote). */
  clientScope: SalesOrderClientScope;
  productVersion: string;
  priority: number;
  planRef?: string;
  notes?: string;
  confirmedAt?: string;
};

export type SalesOrderClientScope = {
  deliverVerticalBrief: boolean;
  deliverBusinessNeeds: boolean;
  deliverStackBlueprint: boolean;
  /** Manufacture / evolve apps/<slug>/<slug>-instance + apps/<slug>/<slug>-api per stack + brief. */
  deliverInstanceManufacturing: boolean;
  /** If true, manufacturing should not start until SaaS alignment has zero errors. */
  requireSaasAlignmentClean: boolean;
};

/** Written when the sales order is confirmed — opens manufacturing execution. */
export type WorkOrderDoc = {
  schemaVersion: 1;
  workOrderId: string;
  salesOrderId: string;
  appSlug: string;
  status: "open" | "closed";
  openedAt: string;
  salesOrderConfirmedAt: string;
  clientScope: SalesOrderClientScope;
  quoteGeneratedAt: string;
  manufacturingTier: AppQuoteBundle["manufacturing"]["tier"];
  taskBoardHint: string;
};
