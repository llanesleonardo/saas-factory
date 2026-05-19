/**
 * Unit tests for the component composer + manifest validator + registry helpers.
 *
 * Run with:
 *   npm run test:components
 * which expands to:
 *   node --import tsx --test factory/factory_libs/components/__tests__/*.test.ts
 *
 * Tests are deliberately pure (no fs writes). Registry I/O is tested via a
 * small temporary directory created per-test.
 */

import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import type { ComponentManifest, DiscoveredComponent } from "../component-manifest-types.js";
import { validateComponentManifest } from "../component-manifest.js";
import {
  componentsByCapability,
  capabilitiesPresent,
  discoverComponents,
  findById,
  summarize,
} from "../component-registry.js";
import { buildComponentPlan, ComposerError, matchesBlueprint } from "../composer.js";

function makeManifest(over: Partial<ComponentManifest> = {}): ComponentManifest {
  return {
    schemaVersion: 1,
    componentId: "auth-jwt-builtin",
    version: "0.1.0",
    capability: "auth",
    provider: "jwt-builtin",
    description: "Built-in JWT auth",
    blueprintKey: "authDetail",
    appliesWhen: {
      requirements: { needsAuth: true },
      fields: { sessionModel: "stateless-jwt" },
    },
    files: [],
    deps: [],
    env: [],
    ...over,
  };
}

function makeDiscovered(m: ComponentManifest, rootSuffix = ""): DiscoveredComponent {
  return {
    manifest: m,
    packageRoot: `/repo/packages/components/${m.componentId}${rootSuffix}`,
    manifestRelPath: `packages/components/${m.componentId}/manifest.json`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// validator
// ─────────────────────────────────────────────────────────────────────────────

test("validator: accepts a minimal manifest", () => {
  const r = validateComponentManifest(makeManifest());
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.manifest.componentId, "auth-jwt-builtin");
});

test("validator: rejects unknown capability", () => {
  const r = validateComponentManifest({ ...makeManifest(), capability: "wat" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.some((e) => e.startsWith("capability:")));
});

test("validator: rejects malformed file entries with target list of errors", () => {
  const r = validateComponentManifest({
    ...makeManifest(),
    files: [{ from: 123, to: "x", target: "api" }],
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.errors.some((e) => e.includes("files[0].from")));
  }
});

test("validator: rejects non-object root", () => {
  const r = validateComponentManifest(null);
  assert.equal(r.ok, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// matchesBlueprint
// ─────────────────────────────────────────────────────────────────────────────

test("matchesBlueprint: real provider matches when requirements + fields hold", () => {
  const ok = matchesBlueprint(
    {
      appSlug: "demo",
      authDetail: {
        identityModel: "email-password",
        sessionModel: "stateless-jwt",
        multiTenancy: "workspace-based",
        securityFeatures: ["email-verification"],
        requirements: { needsAuth: true },
      },
    },
    "authDetail",
    { requirements: { needsAuth: true }, fields: { sessionModel: "stateless-jwt" } },
  );
  assert.equal(ok, true);
});

test("matchesBlueprint: real provider does NOT match when a field differs", () => {
  const ok = matchesBlueprint(
    {
      appSlug: "demo",
      authDetail: {
        identityModel: "email-password",
        sessionModel: "redis-sessions",
        multiTenancy: "workspace-based",
        securityFeatures: [],
        requirements: { needsAuth: true },
      },
    },
    "authDetail",
    { requirements: { needsAuth: true }, fields: { sessionModel: "stateless-jwt" } },
  );
  assert.equal(ok, false);
});

test("matchesBlueprint: sentinel matches when detail is absent", () => {
  const ok = matchesBlueprint({ appSlug: "demo" }, "authDetail", { sentinel: true });
  assert.equal(ok, true);
});

test("matchesBlueprint: sentinel matches when requirements.needsX === false", () => {
  const ok = matchesBlueprint(
    {
      appSlug: "demo",
      authDetail: {
        identityModel: "none",
        sessionModel: "stateless-jwt",
        multiTenancy: "none",
        securityFeatures: [],
        requirements: { needsAuth: false },
      },
    },
    "authDetail",
    { sentinel: true },
  );
  assert.equal(ok, true);
});

test("matchesBlueprint: fields supports array (any-of) match", () => {
  const ok = matchesBlueprint(
    {
      appSlug: "demo",
      authDetail: {
        identityModel: "oauth-only",
        sessionModel: "stateless-jwt",
        multiTenancy: "workspace-based",
        securityFeatures: [],
        requirements: { needsAuth: true },
      },
    },
    "authDetail",
    { fields: { identityModel: ["email-password", "oauth-only"] } },
  );
  assert.equal(ok, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// buildComponentPlan
// ─────────────────────────────────────────────────────────────────────────────

test("composer: selects the JWT adapter when blueprint asks for stateless-jwt + needsAuth", () => {
  const jwt = makeDiscovered(makeManifest());
  const none = makeDiscovered(
    makeManifest({
      componentId: "auth-none",
      provider: "none",
      appliesWhen: { sentinel: true },
      files: [],
      deps: [],
      env: [],
    }),
  );
  const plan = buildComponentPlan(
    {
      appSlug: "demo",
      authDetail: {
        identityModel: "email-password",
        sessionModel: "stateless-jwt",
        multiTenancy: "workspace-based",
        securityFeatures: [],
        requirements: { needsAuth: true },
      },
    },
    [jwt, none],
  );
  assert.equal(plan.selections.length, 1);
  assert.equal(plan.selections[0]!.componentId, "auth-jwt-builtin");
  assert.equal(plan.selections[0]!.sentinel, false);
});

test("composer: falls back to sentinel when auth is off", () => {
  const jwt = makeDiscovered(makeManifest());
  const none = makeDiscovered(
    makeManifest({
      componentId: "auth-none",
      provider: "none",
      appliesWhen: { sentinel: true },
    }),
  );
  const plan = buildComponentPlan(
    {
      appSlug: "demo",
      authDetail: {
        identityModel: "none",
        sessionModel: "stateless-jwt",
        multiTenancy: "none",
        securityFeatures: [],
        requirements: { needsAuth: false },
      },
    },
    [jwt, none],
  );
  assert.equal(plan.selections.length, 1);
  assert.equal(plan.selections[0]!.componentId, "auth-none");
  assert.equal(plan.selections[0]!.sentinel, true);
});

test("composer: errors when two adapters match", () => {
  const a = makeDiscovered(makeManifest({ componentId: "auth-a" }));
  const b = makeDiscovered(makeManifest({ componentId: "auth-b" }));
  assert.throws(
    () =>
      buildComponentPlan(
        {
          appSlug: "demo",
          authDetail: {
            identityModel: "email-password",
            sessionModel: "stateless-jwt",
            multiTenancy: "workspace-based",
            securityFeatures: [],
            requirements: { needsAuth: true },
          },
        },
        [a, b],
      ),
    (err: unknown) => err instanceof ComposerError && err.reasons[0]!.includes("matched 2 adapters"),
  );
});

test("composer: errors when no adapter matches a capability the registry knows about", () => {
  const jwt = makeDiscovered(makeManifest());
  assert.throws(
    () =>
      buildComponentPlan(
        {
          appSlug: "demo",
          authDetail: {
            identityModel: "email-password",
            sessionModel: "redis-sessions",
            multiTenancy: "workspace-based",
            securityFeatures: [],
            requirements: { needsAuth: true },
          },
        },
        [jwt],
      ),
    (err: unknown) =>
      err instanceof ComposerError &&
      err.reasons[0]!.includes('capability "auth" has no adapter matching'),
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// registry helpers
// ─────────────────────────────────────────────────────────────────────────────

test("registry helpers: capabilitiesPresent + componentsByCapability + findById + summarize", () => {
  const jwt = makeDiscovered(makeManifest());
  const none = makeDiscovered(
    makeManifest({
      componentId: "auth-none",
      provider: "none",
      appliesWhen: { sentinel: true },
    }),
  );
  const both = [jwt, none];
  assert.deepEqual(capabilitiesPresent(both), ["auth"]);
  assert.equal(componentsByCapability(both, "auth").length, 2);
  assert.equal(componentsByCapability(both, "billing").length, 0);
  assert.ok(findById(both, "auth-none"));
  assert.equal(findById(both, "nope"), undefined);
  assert.ok(summarize(jwt).startsWith("auth-jwt-builtin"));
});

// ─────────────────────────────────────────────────────────────────────────────
// discoverComponents (I/O against a tmpdir)
// ─────────────────────────────────────────────────────────────────────────────

test("discoverComponents: loads valid manifests, reports invalid ones, ignores empty folders", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "components-test-"));
  try {
    const root = path.join(tmp, "packages", "components");
    await fs.mkdir(path.join(root, "auth-jwt-builtin"), { recursive: true });
    await fs.mkdir(path.join(root, "auth-broken"), { recursive: true });
    await fs.mkdir(path.join(root, "empty-stub"), { recursive: true });
    await fs.writeFile(
      path.join(root, "auth-jwt-builtin", "manifest.json"),
      JSON.stringify(makeManifest()),
      "utf8",
    );
    await fs.writeFile(
      path.join(root, "auth-broken", "manifest.json"),
      "{ not json",
      "utf8",
    );

    const result = await discoverComponents(tmp);
    assert.equal(result.components.length, 1);
    assert.equal(result.components[0]!.manifest.componentId, "auth-jwt-builtin");
    const warningKinds = result.warnings.map((w) => `${w.componentDir}:${w.kind}`);
    assert.ok(warningKinds.some((k) => k.startsWith("auth-broken:invalid-json")));
    assert.ok(warningKinds.some((k) => k.startsWith("empty-stub:missing-manifest")));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
