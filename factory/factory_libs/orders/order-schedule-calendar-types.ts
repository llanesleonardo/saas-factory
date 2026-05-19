/**
 * Calendar bundle for scheduling manufacturing / delivery windows per shop order.
 * Intended for a future React calendar (e.g. react-big-calendar, FullCalendar) — ISO dates, optional null end.
 */
export type OrderScheduleCalendarDoc = {
  schemaVersion: 1;
  /** Bump when merging events or changing shape for consumers. */
  calendarVersion: number;
  orderId: string;
  workOrderId?: string;
  /** IANA zone for interpreting all-day boundaries; store UTC-safe ISO instants when using datetimes. */
  timeZone: string;
  updatedAt: string;
  events: OrderScheduleEvent[];
};

export type OrderScheduleEvent = {
  id: string;
  kind: "manufacturing" | "milestone" | "block";
  title: string;
  /** Apps covered (from order manifest productId / sales order appSlug); multi-app orders can list several. */
  appSlugs: string[];
  /** ISO 8601 date (YYYY-MM-DD) or full instant — start of scheduled work. */
  start: string;
  /**
   * Planned completion; omit or `null` = not set yet (open-ended for the React UI).
   * Use `null` in JSON, not empty string, for “no end date yet”.
   */
  end: string | null;
  /** When true, `start`/`end` are calendar dates (no time-of-day). */
  allDay?: boolean;
  notes?: string;
};
