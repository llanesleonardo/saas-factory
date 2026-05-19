/** Lint + format tooling interface. */

export type LinterInput = { paths: string[] };

export async function runToolLinter(input: LinterInput): Promise<{ ok: boolean; issues: number }> {
  return { ok: true, issues: input.paths.length > 0 ? 0 : 0 };
}
