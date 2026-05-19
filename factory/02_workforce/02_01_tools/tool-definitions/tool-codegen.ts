/** Code generation tooling interface (wire to CLIs / codegen in-repo). */

export type CodegenInput = { target: string; dryRun: boolean };

export async function runToolCodegen(_input: CodegenInput): Promise<{ ok: boolean }> {
  return { ok: true };
}
