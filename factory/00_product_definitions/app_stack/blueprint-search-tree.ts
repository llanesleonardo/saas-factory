/**
 * Search tree (separate from AI).
 *
 * Distinguishes keyword / product search from AI vector search.
 */
import { confirm, select } from "@inquirer/prompts";

export type SearchMode = "none" | "keyword" | "semantic" | "hybrid";

export type SearchEngine = "postgres-fts" | "meilisearch" | "elasticsearch" | "none";

export type SearchIndexing = "none" | "on-write" | "async-indexer";

export type SearchRequirements = {
  needsSearch: boolean;
  needsIndexerJobs: boolean;
  needsSearchService: boolean;
};

export type SearchDetail = {
  enabled: boolean;
  mode: SearchMode;
  engine: SearchEngine;
  indexing: SearchIndexing;
  requirements: SearchRequirements;
};

function deriveSearchRequirements(d: Omit<SearchDetail, "requirements">): SearchRequirements {
  const needsSearch = d.enabled;
  const needsIndexerJobs = d.enabled && d.indexing === "async-indexer";
  const needsSearchService = d.enabled && (d.engine === "meilisearch" || d.engine === "elasticsearch");
  return { needsSearch, needsIndexerJobs, needsSearchService };
}

export async function promptSearchTree(opts: { depth: "easy" | "advanced" }): Promise<{ searchDetail?: SearchDetail }> {
  const enabled = await confirm({ message: "Search · Add product/app search?", default: opts.depth === "easy" });
  if (!enabled) return {};

  const mode =
    opts.depth === "easy"
      ? ("keyword" as const)
      : ((await select({
          message: "Search · Mode",
          choices: [
            { name: "Keyword search", value: "keyword" as const },
            { name: "Semantic search (non-AI embeddings can still be used)", value: "semantic" as const },
            { name: "Hybrid (keyword + semantic)", value: "hybrid" as const },
          ],
        })) as SearchMode);

  const engine =
    opts.depth === "easy"
      ? ("postgres-fts" as const)
      : ((await select({
          message: "Search · Engine",
          choices: [
            { name: "Postgres FTS", value: "postgres-fts" as const },
            { name: "Meilisearch", value: "meilisearch" as const },
            { name: "Elasticsearch", value: "elasticsearch" as const },
          ],
        })) as SearchEngine);

  const indexing =
    opts.depth === "easy"
      ? ("on-write" as const)
      : ((await select({
          message: "Search · Indexing",
          choices: [
            { name: "On-write (inline updates)", value: "on-write" as const },
            { name: "Async indexer (jobs)", value: "async-indexer" as const },
          ],
        })) as SearchIndexing);

  const base: Omit<SearchDetail, "requirements"> = { enabled, mode, engine, indexing };
  return { searchDetail: { ...base, requirements: deriveSearchRequirements(base) } };
}

export function isValidSearchDetail(x: unknown): x is SearchDetail {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.enabled !== "boolean") return false;
  if (typeof o.mode !== "string") return false;
  if (typeof o.engine !== "string") return false;
  if (typeof o.indexing !== "string") return false;
  if (o.requirements === null || typeof o.requirements !== "object" || Array.isArray(o.requirements)) return false;
  return true;
}
