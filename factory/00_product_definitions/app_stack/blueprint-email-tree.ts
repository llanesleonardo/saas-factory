/**
 * Email / Comms tree.
 *
 * Only meaningful when auth exists or SaaS/billing exists.
 * Emits jobs dependency (send pipeline) and template needs.
 */
import { confirm, select } from "@inquirer/prompts";

export type EmailProvider = "none" | "resend" | "sendgrid" | "ses" | "mailgun";
export type TemplateMode = "none" | "provider-templates" | "code-templates";
export type DeliveryMode = "sync-dev-only" | "async-queue";

export type EmailRequirements = {
  needsEmailSystem: boolean;
  needsTemplates: boolean;
  needsJobQueue: boolean;
};

export type EmailDetail = {
  enabled: boolean;
  provider: EmailProvider;
  templates: TemplateMode;
  delivery: DeliveryMode;
  requirements: EmailRequirements;
};

function deriveEmailRequirements(d: Omit<EmailDetail, "requirements">): EmailRequirements {
  const needsEmailSystem = d.enabled && d.provider !== "none";
  const needsTemplates = d.enabled && d.templates !== "none";
  const needsJobQueue = d.enabled && d.delivery === "async-queue";
  return { needsEmailSystem, needsTemplates, needsJobQueue };
}

export async function promptEmailTree(opts: { depth: "easy" | "advanced"; defaultEnabled?: boolean }): Promise<{ emailDetail?: EmailDetail }> {
  const enabled = await confirm({
    message: "Email · Enable transactional email?",
    default: opts.defaultEnabled ?? (opts.depth === "easy"),
  });
  if (!enabled) return {};

  const provider =
    opts.depth === "easy"
      ? ("resend" as const)
      : ((await select({
          message: "Email · Provider",
          choices: [
            { name: "Resend", value: "resend" as const },
            { name: "SendGrid", value: "sendgrid" as const },
            { name: "AWS SES", value: "ses" as const },
            { name: "Mailgun", value: "mailgun" as const },
            { name: "None / later", value: "none" as const },
          ],
        })) as EmailProvider);

  const templates =
    opts.depth === "easy"
      ? ("code-templates" as const)
      : ((await select({
          message: "Email · Templates",
          choices: [
            { name: "Provider templates", value: "provider-templates" as const },
            { name: "Code templates (React/Handlebars/etc.)", value: "code-templates" as const },
            { name: "None", value: "none" as const },
          ],
        })) as TemplateMode);

  const delivery =
    opts.depth === "easy"
      ? ("async-queue" as const)
      : ((await select({
          message: "Email · Delivery",
          choices: [
            { name: "Async queue (recommended)", value: "async-queue" as const },
            { name: "Sync (dev only)", value: "sync-dev-only" as const },
          ],
        })) as DeliveryMode);

  const base: Omit<EmailDetail, "requirements"> = { enabled, provider, templates, delivery };
  return { emailDetail: { ...base, requirements: deriveEmailRequirements(base) } };
}

export function isValidEmailDetail(x: unknown): x is EmailDetail {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.enabled !== "boolean") return false;
  if (typeof o.provider !== "string") return false;
  if (typeof o.templates !== "string") return false;
  if (typeof o.delivery !== "string") return false;
  if (o.requirements === null || typeof o.requirements !== "object" || Array.isArray(o.requirements)) return false;
  return true;
}
