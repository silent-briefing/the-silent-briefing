-- Directus schema for system tables (isolate from public)
CREATE SCHEMA IF NOT EXISTS directus;

-- Role for Directus to connect with (not superuser)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'directus_user') THEN
    CREATE ROLE directus_user LOGIN PASSWORD 'changeme_in_env';
  END IF;
END $$;

-- Grant Directus access to both schemas
GRANT USAGE ON SCHEMA public TO directus_user;
GRANT USAGE ON SCHEMA directus TO directus_user;
GRANT ALL PRIVILEGES ON SCHEMA directus TO directus_user;

-- Public schema: read our tables, write via service flows
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO directus_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO directus_user;

-- Allow Directus to create its own tables in directus schema
ALTER DEFAULT PRIVILEGES IN SCHEMA directus
  GRANT ALL ON TABLES TO directus_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA directus
  GRANT ALL ON SEQUENCES TO directus_user;

-- Future tables (applies to tables created after this migration)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO directus_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO directus_user;
