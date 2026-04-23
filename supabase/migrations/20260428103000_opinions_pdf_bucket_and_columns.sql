-- C.8: Private PDF storage for admin-uploaded opinions + link columns.

-- ---------------------------------------------------------------------------
-- public.opinions: storage path, ingestion lifecycle, graph entity
-- ---------------------------------------------------------------------------
ALTER TABLE public.opinions
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS ingestion_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.opinions.pdf_storage_path IS 'Path inside storage bucket opinions-pdf (no leading slash).';
COMMENT ON COLUMN public.opinions.ingestion_status IS 'pending | processing | ready | failed';
COMMENT ON COLUMN public.opinions.entity_id IS 'Entity graph node (type issue) for accepted entity_edges.';

CREATE INDEX IF NOT EXISTS idx_opinions_entity_id ON public.opinions (entity_id);

-- ---------------------------------------------------------------------------
-- public.bills: unique bill_number for admin create/list
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_bills_bill_number_unique ON public.bills (bill_number);

-- ---------------------------------------------------------------------------
-- Storage: private bucket for opinion PDFs (BFF uses service role)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'opinions-pdf',
  'opinions-pdf',
  false,
  52428800,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "service_role_all_opinions_pdf_objects" ON storage.objects;
CREATE POLICY "service_role_all_opinions_pdf_objects"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'opinions-pdf')
  WITH CHECK (bucket_id = 'opinions-pdf');
