-- Phase C.3 — human review / publish workflow (schema prep).
-- Queue filters use requires_human_review; publish/reject set reviewed_* and review_note.

ALTER TABLE public.dossier_claims
  ADD COLUMN IF NOT EXISTS requires_human_review boolean NOT NULL DEFAULT false;

ALTER TABLE public.dossier_claims
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.dossier_claims
  ADD COLUMN IF NOT EXISTS reviewed_by text;

ALTER TABLE public.dossier_claims
  ADD COLUMN IF NOT EXISTS review_note text;

CREATE INDEX IF NOT EXISTS idx_dossier_claims_review_queue
  ON public.dossier_claims (requires_human_review, official_id)
  WHERE requires_human_review = true;

COMMENT ON COLUMN public.dossier_claims.requires_human_review IS
  'When true, claim should appear in admin dossier review queue.';
COMMENT ON COLUMN public.dossier_claims.reviewed_at IS
  'Set when an admin publishes or explicitly marks reviewed.';
COMMENT ON COLUMN public.dossier_claims.reviewed_by IS
  'Clerk user id (sub) of the reviewer.';
COMMENT ON COLUMN public.dossier_claims.review_note IS
  'Admin rejection or review note; claim retained for history.';
