/**
 * Per-order entry: re-exports shared manifest validation (`../validate-manifest.ts`).
 * Import from here or from `../validate-manifest.js` directly.
 */
export type { OrderManifest } from "../validate-manifest.js";
export { validateOrderManifest } from "../validate-manifest.js";
