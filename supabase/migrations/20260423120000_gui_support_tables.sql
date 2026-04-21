-- GUI Phase A: admin audit, saved views, alerts, settings, feature flags (Clerk JWT claims in RLS).

-- --- admin_audit_log ---
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id text NOT NULL,
  actor_role text NOT NULL,
  org_id text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  before jsonb NOT NULL DEFAULT '{}'::jsonb,
  after jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_log_org_created_idx ON public.admin_audit_log (org_id, created_at DESC);
CREATE INDEX admin_audit_log_actor_idx ON public.admin_audit_log (actor_user_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_log_insert_service_role"
  ON public.admin_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "admin_audit_log_select_admins"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin');

-- --- user_saved_views ---
CREATE TABLE public.user_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  org_id text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('officials', 'dossier', 'search')),
  query jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_saved_views_user_idx ON public.user_saved_views (user_id, org_id);

ALTER TABLE public.user_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_saved_views_select"
  ON public.user_saved_views
  FOR SELECT
  TO authenticated
  USING (
    (select auth.jwt()->>'sub') = user_id
    OR (
      (select auth.jwt()->>'role') = 'admin'
      AND (select auth.jwt()->>'org_id') IS NOT DISTINCT FROM org_id
    )
  );

CREATE POLICY "user_saved_views_insert_own"
  ON public.user_saved_views
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_saved_views_update_own_or_org_admin"
  ON public.user_saved_views
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.jwt()->>'sub') = user_id
    OR (
      (select auth.jwt()->>'role') = 'admin'
      AND (select auth.jwt()->>'org_id') IS NOT DISTINCT FROM org_id
    )
  )
  WITH CHECK (
    (select auth.jwt()->>'sub') = user_id
    OR (
      (select auth.jwt()->>'role') = 'admin'
      AND (select auth.jwt()->>'org_id') IS NOT DISTINCT FROM org_id
    )
  );

CREATE POLICY "user_saved_views_delete_own_or_org_admin"
  ON public.user_saved_views
  FOR DELETE
  TO authenticated
  USING (
    (select auth.jwt()->>'sub') = user_id
    OR (
      (select auth.jwt()->>'role') = 'admin'
      AND (select auth.jwt()->>'org_id') IS NOT DISTINCT FROM org_id
    )
  );

-- --- alerts ---
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  kind text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered_at timestamptz,
  read_at timestamptz
);

CREATE INDEX alerts_org_idx ON public.alerts (org_id);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts_org_members"
  ON public.alerts
  FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'org_id') IS NOT DISTINCT FROM org_id)
  WITH CHECK ((select auth.jwt()->>'org_id') IS NOT DISTINCT FROM org_id);

-- --- settings ---
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_authenticated"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "settings_write_service_role"
  ON public.settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- --- feature_flags ---
CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled_for jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_select_authenticated"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "feature_flags_write_service_role"
  ON public.feature_flags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants (RLS still enforced for authenticated)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_audit_log TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_saved_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT SELECT ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
