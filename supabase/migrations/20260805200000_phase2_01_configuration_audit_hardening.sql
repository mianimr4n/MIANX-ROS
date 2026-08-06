-- Hardening: make configuration change log append-only and prevent deletes

BEGIN;

-- Prevent UPDATE/DELETE on configuration_change_log
CREATE OR REPLACE FUNCTION public.prevent_configuration_change_log_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'configuration_change_log is append-only';
END;
$$ SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_configuration_change_log_mutation ON public.configuration_change_log;
CREATE TRIGGER trg_prevent_configuration_change_log_mutation
  BEFORE UPDATE OR DELETE ON public.configuration_change_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_configuration_change_log_mutation();

-- Prevent DELETE on configuration_versions to retain historical versions
CREATE OR REPLACE FUNCTION public.prevent_configuration_versions_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'configuration_versions rows must not be deleted';
END;
$$ SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_configuration_versions_delete ON public.configuration_versions;
CREATE TRIGGER trg_prevent_configuration_versions_delete
  BEFORE DELETE ON public.configuration_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_configuration_versions_delete();

COMMIT;
