-- Step 2 / Task S3: Bounded semantic search RPC for future operator console (authenticated).
-- SECURITY DEFINER: callers do not need broad SELECT on rag_chunks; no embedding column returned.

CREATE OR REPLACE FUNCTION public.match_rag_chunks_public(
  query_embedding vector(1024),
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  content text,
  source_url text,
  source_type text,
  chunk_index int,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.content,
    c.source_url,
    c.source_type,
    c.chunk_index,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM public.rag_chunks c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(COALESCE(match_count, 8), 1), 50);
$$;

COMMENT ON FUNCTION public.match_rag_chunks_public(vector, int) IS
  'Cosine similarity search over rag_chunks; max 50 rows; EXECUTE for authenticated + service_role only.';

REVOKE ALL ON FUNCTION public.match_rag_chunks_public(vector, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_rag_chunks_public(vector, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_rag_chunks_public(vector, int) TO service_role;
