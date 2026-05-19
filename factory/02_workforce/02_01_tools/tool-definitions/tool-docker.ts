/** Container build + compose wiring interface. */

export type DockerToolInput = { composeFile?: string; profile?: string };

export async function runToolDocker(
  input: DockerToolInput,
): Promise<{ ok: boolean; detail: string }> {
  return {
    ok: true,
    detail: `stub docker compose=${input.composeFile ?? "default"}`,
  };
}
