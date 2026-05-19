/**
 * Write / update **`order-schedule-calendar.json`** for a shop order (manufacturing window).
 * `end` is stored as JSON **`null`** when not provided — for a React calendar to show an open-ended bar.
 *
 * Usage:
 *   npm run mfg -- order schedule <orderId> --start 2026-06-01
 *   npm run mfg -- order schedule <orderId> --start 2026-06-01T09:00:00Z
 *   npm run mfg -- order schedule <orderId> --start 2026-06-01 --end 2026-08-31
 *   npm run mfg -- order schedule <orderId> --start 2026-06-01 --tz UTC --json
 */
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type OrderManifest, primaryProductId } from "./validate-manifest.js";
import type { OrderScheduleCalendarDoc, OrderScheduleEvent } from "../../factory_libs/orders/order-schedule-calendar-types.js";
import type { WorkOrderDoc } from "../../factory_libs/commerce/sales-work-order-types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

const CAL_FILE = "order-schedule-calendar.json";
const SLUG = /^[a-z][a-z0-9-]*$/;

function parseArgs(argv: string[]): {
  orderId?: string;
  start?: string;
  end?: string | null;
  timeZone: string;
  title?: string;
  json: boolean;
  help: boolean;
  clearEnd: boolean;
} {
  const json = argv.includes("--json");
  const help = argv.includes("--help") || argv.includes("-h");
  const clearEnd = argv.includes("--clear-end");

  const raw = argv.filter((a) => a !== "--");

  function opt(flag: string): string | undefined {
    const i = raw.indexOf(flag);
    if (i < 0 || !raw[i + 1] || raw[i + 1].startsWith("--")) return undefined;
    return raw[i + 1];
  }

  const start = opt("--start")?.trim();
  const endRaw = opt("--end");
  const end = endRaw === undefined ? undefined : endRaw.trim() === "" ? null : endRaw.trim();
  const timeZone = opt("--tz")?.trim() ?? "UTC";
  const title = opt("--title")?.trim();
  const orderIdFromFlag = opt("--order-id")?.trim();

  const skipNext = new Set(["--start", "--end", "--tz", "--title", "--order-id"]);
  const orderId =
    orderIdFromFlag ??
    raw.find((a, i) => {
      if (a.startsWith("--")) return false;
      const prev = raw[i - 1];
      if (prev && skipNext.has(prev)) return false;
      return true;
    });

  return { orderId, start, end, timeZone, title, json, help, clearEnd };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function looksAllDay(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function usage(): void {
  console.error(`Usage: npm run mfg -- order schedule <orderId> --start <ISO-date-or-datetime> [--end <ISO>] [--tz IANA] [--order-id <id>] [--title "..."] [--json]

  --start     Required. YYYY-MM-DD (all-day) or full ISO-8601 instant.
  --end       Optional planned finish. Omit on **update** to keep the previous end; on first schedule omit → null (open-ended).
  --tz        IANA time zone label (default: UTC). Stored on the calendar doc for UI interpretation.
  --order-id  Optional if <orderId> is given as the first positional argument.
  --clear-end Force end back to null (open-ended) even if a previous end existed.
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return;
  }

  if (!args.orderId?.trim()) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (!args.start) {
    console.error("Missing --start (required).");
    usage();
    process.exitCode = 1;
    return;
  }

  const orderId = args.orderId.trim();
  const orderDir = path.join(__dirname, orderId);
  const manifestPath = path.join(orderDir, "order-manifest.json");
  const woPath = path.join(orderDir, "work-order.json");
  const calPath = path.join(orderDir, CAL_FILE);

  if (!(await pathExists(manifestPath))) {
    console.error(`No order folder or manifest: ${path.relative(REPO_ROOT, manifestPath)}`);
    process.exitCode = 1;
    return;
  }

  let manifest: OrderManifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8")) as OrderManifest;
  } catch (e) {
    console.error("Invalid order-manifest.json:", e);
    process.exitCode = 1;
    return;
  }

  const slug = primaryProductId(manifest);
  if (!SLUG.test(slug)) {
    console.error(`Invalid primary productId in manifest: ${slug}`);
    process.exitCode = 1;
    return;
  }

  let workOrderId: string | undefined;
  if (await pathExists(woPath)) {
    try {
      const wo = JSON.parse(await readFile(woPath, "utf8")) as WorkOrderDoc;
      if (wo.schemaVersion === 1 && typeof wo.workOrderId === "string") workOrderId = wo.workOrderId;
    } catch {
      /* ignore malformed WO */
    }
  }

  const eventId = `evt-${orderId.replace(/[^a-zA-Z0-9._-]/g, "-")}-manufacturing`;

  let prevManufacturingEnd: string | null | undefined;
  if (await pathExists(calPath)) {
    try {
      const prev = JSON.parse(await readFile(calPath, "utf8")) as OrderScheduleCalendarDoc;
      prevManufacturingEnd = prev.events?.find((e) => e.id === eventId)?.end;
    } catch {
      /* ignore */
    }
  }

  const endValue: string | null = args.clearEnd
    ? null
    : args.end !== undefined
      ? args.end
      : (prevManufacturingEnd ?? null);

  const title = args.title ?? `Manufacturing — ${slug}`;

  const newEvent: OrderScheduleEvent = {
    id: eventId,
    kind: "manufacturing",
    title,
    appSlugs: [slug],
    start: args.start,
    end: endValue,
    allDay: looksAllDay(args.start) && (endValue === null || looksAllDay(endValue)),
  };

  let doc: OrderScheduleCalendarDoc;
  if (await pathExists(calPath)) {
    try {
      const prev = JSON.parse(await readFile(calPath, "utf8")) as OrderScheduleCalendarDoc;
      const others = (prev.events ?? []).filter((e) => e.id !== eventId);
      doc = {
        ...prev,
        calendarVersion: (prev.calendarVersion ?? 1) + 1,
        orderId,
        workOrderId: workOrderId ?? prev.workOrderId,
        timeZone: args.timeZone,
        updatedAt: new Date().toISOString(),
        events: [...others, newEvent],
      };
    } catch {
      doc = freshDoc(orderId, workOrderId, args.timeZone, newEvent);
    }
  } else {
    doc = freshDoc(orderId, workOrderId, args.timeZone, newEvent);
  }

  await writeFile(calPath, JSON.stringify(doc, null, 2) + "\n", "utf8");
  const rel = path.relative(REPO_ROOT, calPath);

  if (args.json) {
    console.log(JSON.stringify({ ok: true, path: rel, calendar: doc }, null, 2));
  } else {
    console.log(`\nSchedule written: ${rel}`);
    console.log(`  event: ${newEvent.id}`);
    console.log(`  start: ${newEvent.start}`);
    console.log(`  end:   ${newEvent.end === null ? "(null — not set; open-ended for UI)" : newEvent.end}`);
    console.log(`  apps:  ${newEvent.appSlugs.join(", ")}`);
    console.log(`\nSchema: factory/factory_schemas/order-schedule-calendar.schema.json\n`);
  }

  process.exitCode = 0;
}

function freshDoc(
  orderId: string,
  workOrderId: string | undefined,
  timeZone: string,
  event: OrderScheduleEvent,
): OrderScheduleCalendarDoc {
  return {
    schemaVersion: 1,
    calendarVersion: 1,
    orderId,
    workOrderId,
    timeZone,
    updatedAt: new Date().toISOString(),
    events: [event],
  };
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]!) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  void main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
