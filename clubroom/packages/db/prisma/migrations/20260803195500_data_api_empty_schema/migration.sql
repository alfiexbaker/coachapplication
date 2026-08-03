-- Supabase keeps PostgREST running when the Data API is disabled. Point it at
-- an existing empty schema so it can refresh without logging a missing-schema
-- error, while preserving Fastify /v1 as the only product-data boundary.
CREATE SCHEMA IF NOT EXISTS pgrst_no_exposed_schemas AUTHORIZATION postgres;

REVOKE ALL ON SCHEMA pgrst_no_exposed_schemas FROM PUBLIC, anon, authenticated, service_role;

ALTER ROLE authenticator SET pgrst.db_schemas = 'pgrst_no_exposed_schemas';

NOTIFY pgrst, 'reload config';
