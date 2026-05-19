import path from "node:path";

const SPRINTS_SEGMENT = path.join("factory", "03_assembly_lines", "05-sprints");

/** e.g. `factory/03_assembly_lines/05-sprints/<orderId>/<productId>` */
export function sprintProductDir(repoRoot: string, orderId: string, productId: string): string {
  const o = orderId.trim().replace(/[/\\]+/g, "_");
  const p = productId.trim().replace(/[/\\]+/g, "_");
  return path.join(repoRoot, SPRINTS_SEGMENT, o, p);
}

/** Folder name `sprint-001` … `sprint-999` for stable sort. */
export function sprintFolderName(sprintNumber: number): string {
  if (!Number.isInteger(sprintNumber) || sprintNumber < 1) {
    throw new Error(`Invalid sprintNumber: ${sprintNumber}`);
  }
  return `sprint-${String(sprintNumber).padStart(3, "0")}`;
}

export function sprintJsonPath(repoRoot: string, orderId: string, productId: string, sprintNumber: number): string {
  return path.join(sprintProductDir(repoRoot, orderId, productId), sprintFolderName(sprintNumber), "sprint.json");
}
