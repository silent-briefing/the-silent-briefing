-- Phase 1.5: ANN index + RPC for similarity search over rag_chunks.embedding (1024-dim, cosine).

CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_hnsw
  ON public.rag_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_rag_chunks(
  query_embedding vector(1024),
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  content text,
  source_url text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id,
    c.content,
    c.source_url,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM public.rag_chunks c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.match_rag_chunks(vector, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_rag_chunks(vector, int) TO service_role;
