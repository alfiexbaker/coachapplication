-- Keep the RLS auto-enable event trigger, but move its SECURITY DEFINER
-- function out of Supabase's exposed public API schema.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS private';
    EXECUTE 'REVOKE ALL ON SCHEMA private FROM PUBLIC';
    EXECUTE 'ALTER FUNCTION public.rls_auto_enable() SET SCHEMA private';
    EXECUTE 'REVOKE ALL ON FUNCTION private.rls_auto_enable() FROM anon, authenticated, PUBLIC';
  END IF;
END $$;
