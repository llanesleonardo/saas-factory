/**
 * Payments / Billing tree.
 *
 * This should only be invoked when SaaS signals exist (e.g. multi-tenant).
 * Emits requirements for webhook ingestion, jobs, and audit logging.
 */
import { confirm, select } from "@inquirer/prompts";

export type BillingMode = "none" | "subscriptions" | "usage-billing" | "hybrid";
export type BillingProvider = "stripe" | "none-yet";
export type WebhookIngestion = "none" | "required";

export type BillingRequirements = {
  needsPayments: boolean;
  needsBillingWebhooks: boolean;
  needsUsageMetering: boolean;
  needsSubscriptions: boolean;
  needsJobQueue: boolean;
  needsAuditLog: boolean;
};

export type BillingDetail = {
  enabled: boolean;
  provider: BillingProvider;
  mode: BillingMode;
  webhookIngestion: WebhookIngestion;
  requirements: BillingRequirements;
};

function deriveBillingRequirements(d: Omit<BillingDetail, "requirements">): BillingRequirements {
  const needsPayments = d.enabled;
  const needsSubscriptions = d.enabled && (d.mode === "subscriptions" || d.mode === "hybrid");
  const needsUsageMetering = d.enabled && (d.mode === "usage-billing" || d.mode === "hybrid");
  const needsBillingWebhooks = d.enabled && d.webhookIngestion === "required";
  const needsJobQueue = d.enabled && (needsUsageMetering || needsBillingWebhooks);
  const needsAuditLog = d.enabled;
  return { needsPayments, needsBillingWebhooks, needsUsageMetering, needsSubscriptions, needsJobQueue, needsAuditLog };
}

export async function promptBillingTree(opts: { depth: "easy" | "advanced"; defaultEnabled?: boolean }): Promise<{ billingDetail?: BillingDetail }> {
  const enabled = await confirm({
    message: "Billing · Enable payments/billing?",
    default: opts.defaultEnabled ?? false,
  });
  if (!enabled) return {};

  const provider =
    opts.depth === "easy"
      ? ("stripe" as const)
      : ((await select({
          message: "Billing · Provider",
          choices: [
            { name: "Stripe", value: "stripe" as const },
            { name: "Not decided yet", value: "none-yet" as const },
          ],
        })) as BillingProvider);

  const mode =
    opts.depth === "easy"
      ? ("subscriptions" as const)
      : ((await select({
          message: "Billing · Billing mode",
          choices: [
            { name: "Subscriptions", value: "subscriptions" as const },
            { name: "Usage billing", value: "usage-billing" as const },
            { name: "Hybrid (subs + usage)", value: "hybrid" as const },
          ],
        })) as BillingMode);

  const webhookIngestion: WebhookIngestion = "required";

  const base: Omit<BillingDetail, "requirements"> = { enabled, provider, mode, webhookIngestion };
  return { billingDetail: { ...base, requirements: deriveBillingRequirements(base) } };
}

export function isValidBillingDetail(x: unknown): x is BillingDetail {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.enabled !== "boolean") return false;
  if (typeof o.provider !== "string") return false;
  if (typeof o.mode !== "string") return false;
  if (typeof o.webhookIngestion !== "string") return false;
  if (o.requirements === null || typeof o.requirements !== "object" || Array.isArray(o.requirements)) return false;
  return true;
}
