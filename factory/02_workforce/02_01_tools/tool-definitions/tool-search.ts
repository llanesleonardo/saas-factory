/** Knowledge / context retrieval (repo search, docs, embeddings — stub). */

export type SearchToolInput = { query: string; limit?: number };

export async function runToolSearch(input: SearchToolInput): Promise<{ hits: string[] }> {
  return { hits: [input.query.slice(0, 120)] };
}
