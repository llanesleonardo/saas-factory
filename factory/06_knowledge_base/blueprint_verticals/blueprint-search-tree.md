# Search Tree (separate from AI)

Purpose: define application/product search explicitly, separate from AI vector search.

## Prompts
- Enable search?
- Mode: keyword / semantic / hybrid
- Engine: Postgres FTS / Meilisearch / Elasticsearch
- Indexing: on-write / async indexer (jobs)

## Outputs
### `searchDetail`
Includes derived requirements:
- `requirements.needsSearch`
- `requirements.needsIndexerJobs`
- `requirements.needsSearchService`

