/**
 * Infra decision tree (cross-cutting environment constraints).
 *
 * Currently focuses on storage topology (local vs NAS vs cloud vs mixed).
 * Other subsystems (DB, file uploads, backups) should consume these constraints.
 */
import { input, select } from "@inquirer/prompts";

export type StorageTopology = "local-disk" | "nas-mounted" | "cloud-object-storage" | "managed-block-storage" | "mixed";

export type NasProtocol = "nfs" | "smb";

export type InfraDetail = {
  storageTopology: StorageTopology;
  nas?: { protocol: NasProtocol; mountPath: string };
  notes?: string;
};

async function pick<T extends string>(message: string, choices: { value: T; label: string }[]): Promise<T> {
  const value = await select({
    message,
    choices: choices.map((c) => ({ name: c.label, value: c.value })),
  });
  return value as T;
}

export async function promptInfraTree(opts: { depth: "easy" | "advanced" }): Promise<{ infraDetail: InfraDetail }> {
  const storageTopology = await pick<StorageTopology>("Infra · Storage topology", [
    { value: "local-disk", label: "Local disk (single server / dev machine)" },
    { value: "nas-mounted", label: "NAS mounted volume (NFS/SMB) — your own server" },
    { value: "cloud-object-storage", label: "Cloud object storage (S3/GCS/Azure Blob) first" },
    { value: "managed-block-storage", label: "Managed block storage (cloud disks) mounted to compute" },
    { value: "mixed", label: "Mixed (NAS + cloud, or DB local + files in object storage)" },
  ]);

  let nas: InfraDetail["nas"];
  if (storageTopology === "nas-mounted" || (storageTopology === "mixed" && opts.depth === "advanced")) {
    const protocol = await pick<NasProtocol>("Infra · NAS protocol", [
      { value: "nfs", label: "NFS" },
      { value: "smb", label: "SMB" },
    ]);
    const mountPath = await input({
      message: "Infra · NAS mount path (e.g. /mnt/nas or /Volumes/share)",
      default: "/mnt/nas",
      validate: (v) => (v.trim().startsWith("/") ? true : "Use an absolute path (starts with /)"),
    });
    nas = { protocol, mountPath: mountPath.trim() };
  }

  if (opts.depth === "easy") {
    return { infraDetail: { storageTopology, nas } };
  }

  const notes = await input({
    message: "Infra · Notes (optional)",
    default: "",
  });

  return { infraDetail: { storageTopology, nas, notes: notes.trim() || undefined } };
}
