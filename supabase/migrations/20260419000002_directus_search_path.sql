-- Ensure Directus DDL lands in `directus` schema first (DB_SCHEMA + unqualified names).
ALTER ROLE directus_user SET search_path TO directus, public;
