import { mergeRootWorkspaces } from "../../scaffold-lib.js";

export function workspaceMergeModule(opts: {
  instRel: string;
  apiRel: string;
  dryRun: boolean;
}): { id: string; version: number; apply: () => Promise<void> } {
  const { instRel, apiRel, dryRun } = opts;
  return {
    id: "workspace-merge",
    version: 1,
    apply: async () => mergeRootWorkspaces([instRel, apiRel], dryRun),
  };
}

