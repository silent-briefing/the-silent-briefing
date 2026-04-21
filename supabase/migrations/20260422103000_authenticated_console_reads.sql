-- Step 3 U3.5: SELECT for Supabase `authenticated` role (Clerk JWT → Supabase template).
-- Anon policies unchanged. service_role bypasses RLS as before.
-- Narrow product scope: jurisdictions tree, active officials, claims tied to active officials, accepted graph edges.

CREATE POLICY "authenticated_read_jurisdictions"
  ON public.jurisdictions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_officials_not_deleted"
  ON public.officials
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "authenticated_read_dossier_claims_for_active_officials"
  ON public.dossier_claims
  FOR SELECT
  TO authenticated
  USING (
    official_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.officials o
      WHERE o.id = dossier_claims.official_id
        AND o.deleted_at IS NULL
    )
  );

CREATE POLICY "authenticated_read_accepted_entity_edges"
  ON public.entity_edges
  FOR SELECT
  TO authenticated
  USING (status = 'accepted'::public.edge_status);

COMMENT ON POLICY "authenticated_read_jurisdictions" ON public.jurisdictions IS
  'Operator console: full jurisdiction tree for Palantir-style navigation.';
COMMENT ON POLICY "authenticated_read_officials_not_deleted" ON public.officials IS
  'Operator console: includes non-current rows; excludes soft-deleted.';
COMMENT ON POLICY "authenticated_read_dossier_claims_for_active_officials" ON public.dossier_claims IS
  'Claims linked to a non-deleted official, or orphan candidate claims (official_id NULL).';
COMMENT ON POLICY "authenticated_read_accepted_entity_edges" ON public.entity_edges IS
  'Same bar as anon: only human-accepted edges in browser-facing graph.';
