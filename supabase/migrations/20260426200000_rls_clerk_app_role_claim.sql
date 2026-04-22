-- Clerk-issued Supabase JWTs use top-level `role` = `authenticated` (PostgREST / Postgres session role).
-- App RBAC (admin vs viewer) lives in `app_role` (map from Clerk `public_metadata.role`).
-- Keep fallback to `role` = 'admin' for older templates / manual tokens.

CREATE OR REPLACE FUNCTION public.jwt_effective_app_role() RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    nullif(trim((SELECT auth.jwt()->>'app_role')), ''),
    nullif(trim((SELECT auth.jwt()->>'role')), '')
  );
$$;

COMMENT ON FUNCTION public.jwt_effective_app_role() IS
  'Prefer JWT app_role (Clerk); fall back to role for legacy templates.';

DROP POLICY IF EXISTS "admin_audit_log_select_admins" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_select_admins"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (public.jwt_effective_app_role() = 'admin');

DROP POLICY IF EXISTS "user_saved_views_select" ON public.user_saved_views;
CREATE POLICY "user_saved_views_select"
  ON public.user_saved_views
  FOR SELECT
  TO authenticated
  USING (
    (select auth.jwt()->>'sub') = user_id
    OR (
      public.jwt_effective_app_role() = 'admin'
      AND (select auth.jwt()->>'org_id') IS NOT DISTINCT FROM org_id
    )
  );

DROP POLICY IF EXISTS "user_saved_views_update_own_or_org_admin" ON public.user_saved_views;
CREATE POLICY "user_saved_views_update_own_or_org_admin"
  ON public.user_saved_views
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.jwt()->>'sub') = user_id
    OR (
      public.jwt_effective_app_role() = 'admin'
      AND (select auth.jwt()->>'org_id') IS NOT DISTINCT FROM org_id
    )
  )
  WITH CHECK (
    (select auth.jwt()->>'sub') = user_id
    OR (
      public.jwt_effective_app_role() = 'admin'
      AND (select auth.jwt()->>'org_id') IS NOT DISTINCT FROM org_id
    )
  );

DROP POLICY IF EXISTS "user_saved_views_delete_own_or_org_admin" ON public.user_saved_views;
CREATE POLICY "user_saved_views_delete_own_or_org_admin"
  ON public.user_saved_views
  FOR DELETE
  TO authenticated
  USING (
    (select auth.jwt()->>'sub') = user_id
    OR (
      public.jwt_effective_app_role() = 'admin'
      AND (select auth.jwt()->>'org_id') IS NOT DISTINCT FROM org_id
    )
  );
