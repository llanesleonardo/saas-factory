/** BMC: Key resources — technical assets (modules, APIs, infra) powering activities. */

export type ModuleRef = {
  id: string;
  kind: "api" | "frontend" | "worker" | "integration" | "other";
  notes?: string;
};

export type SaasModuleMapping = {
  modules: ModuleRef[];
  apiSurfaces: string[];
  infraDependencies: string[];
};

export function emptySaasModuleMapping(): SaasModuleMapping {
  return { modules: [], apiSurfaces: [], infraDependencies: [] };
}
