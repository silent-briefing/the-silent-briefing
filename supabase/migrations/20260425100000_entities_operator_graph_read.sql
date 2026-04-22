-- Phase B.7: operator graph needs entity labels for accepted-edge endpoints.
-- Narrow read: linked to a non-deleted official OR incident to an accepted entity_edge.

CREATE POLICY "anon_read_entities_operator_graph"
  ON public.entities
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.officials o
      WHERE o.entity_id = entities.id
        AND o.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.entity_edges e
      WHERE e.status = 'accepted'::public.edge_status
        AND (e.source_entity_id = entities.id OR e.target_entity_id = entities.id)
    )
  );

CREATE POLICY "authenticated_read_entities_operator_graph"
  ON public.entities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.officials o
      WHERE o.entity_id = entities.id
        AND o.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.entity_edges e
      WHERE e.status = 'accepted'::public.edge_status
        AND (e.source_entity_id = entities.id OR e.target_entity_id = entities.id)
    )
  );

COMMENT ON POLICY "anon_read_entities_operator_graph" ON public.entities IS
  'Operator graph: label nodes tied to officials or accepted graph edges.';
COMMENT ON POLICY "authenticated_read_entities_operator_graph" ON public.entities IS
  'Same as anon_read_entities_operator_graph for Clerk JWT role.';
