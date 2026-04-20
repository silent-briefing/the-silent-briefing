-- Step 2 / Task S2: freshness metadata for RAG chunks (re-embed / invalidation).

ALTER TABLE public.rag_chunks
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz;

ALTER TABLE public.rag_chunks
  ADD COLUMN IF NOT EXISTS chunk_version int NOT NULL DEFAULT 1;

UPDATE public.rag_chunks
SET fetched_at = created_at
WHERE fetched_at IS NULL;

COMMENT ON COLUMN public.rag_chunks.fetched_at IS 'When source bytes were retrieved (ingestion time).';
COMMENT ON COLUMN public.rag_chunks.chunk_version IS 'Increment when chunking strategy changes; default 1.';
