-- Step 2 / Task S4: Minimal public graph read — accepted edges only (Phase 3 console / anon API).
-- dossier_claims: no anon SELECT (defer until Clerk + authenticated policies).

CREATE POLICY "anon_read_accepted_entity_edges"
  ON public.entity_edges
  FOR SELECT
  TO anon
  USING (status = 'accepted'::public.edge_status);

COMMENT ON POLICY "anon_read_accepted_entity_edges" ON public.entity_edges IS
  'Public Palantir-style graph edges after human or workflow acceptance; proposed/rejected stay hidden.';
