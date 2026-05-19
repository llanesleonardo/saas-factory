/**
 * Live-manifest check: walk the *real* `packages/components/` folder, verify
 * every adapter currently shipped validates against the manifest schema, and
 * that for each capability we have a working sentinel.
 *
 * This is the smoke test that catches a typo'd manifest before scaffold ever
 * runs in CI.
 */
import assert from "node:assert/strict";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { discoverComponents } from "../component-registry.js";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..", "..", "..", "..");

test("live: every shipped component manifest validates", async () => {
  const { components, warnings } = await discoverComponents(REPO_ROOT);

  const validationFails = warnings.filter((w) => w.kind === "validation-failed");
  assert.equal(
    validationFails.length,
    0,
    `validation failures:\n${validationFails.map((w) => `  ${w.componentDir}: ${w.detail}`).join("\n")}`,
  );

  assert.ok(
    components.find((c) => c.manifest.componentId === "auth-none"),
    "auth-none sentinel is required",
  );
  assert.ok(
    components.find((c) => c.manifest.componentId === "auth-jwt-builtin"),
    "auth-jwt-builtin is required (first walking-skeleton adapter)",
  );
});

test("live: each capability has at least one sentinel", async () => {
  const { components } = await discoverComponents(REPO_ROOT);
  const byCap = new Map<string, { sentinel: number; real: number }>();
  for (const c of components) {
    const slot = byCap.get(c.manifest.capability) ?? { sentinel: 0, real: 0 };
    if (c.manifest.appliesWhen.sentinel) slot.sentinel++;
    else slot.real++;
    byCap.set(c.manifest.capability, slot);
  }
  for (const [cap, counts] of byCap) {
    assert.ok(
      counts.sentinel >= 1,
      `capability "${cap}" has ${counts.real} real adapter(s) but no sentinel; composer will throw when the capability is off`,
    );
  }
});
