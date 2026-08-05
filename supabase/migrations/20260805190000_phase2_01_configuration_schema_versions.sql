-- Phase 2.1: Configuration schemas and versioned configuration
-- Additive migration: creates configuration_schemas, configuration_versions, configuration_change_log

BEGIN;

CREATE TABLE IF NOT EXISTS public.configuration_schemas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type TEXT NOT NULL CHECK (scope_type IN ('organization','branch')),
    key VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('string','number','boolean','jsonb','secret_ref')),
    default_value JSONB,
    validation_rules JSONB,
    is_required BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS configuration_schemas_key_scope_idx ON public.configuration_schemas (scope_type, key);

CREATE TABLE IF NOT EXISTS public.configuration_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_id uuid NOT NULL REFERENCES public.configuration_schemas(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('organization','branch')),
    scope_id uuid,
    value JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft','pending_approval','active','superseded','rolled_back')),
    created_by uuid,
    approved_by uuid,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS configuration_versions_schema_idx ON public.configuration_versions (schema_id);
CREATE INDEX IF NOT EXISTS configuration_versions_scope_idx ON public.configuration_versions (scope_type, scope_id);

-- ensure only one active per (schema_id, scope_id)
CREATE UNIQUE INDEX IF NOT EXISTS configuration_versions_active_unique ON public.configuration_versions (schema_id, scope_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.configuration_change_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_id uuid REFERENCES public.configuration_schemas(id),
    scope_type TEXT,
    scope_id uuid,
    from_version_id uuid REFERENCES public.configuration_versions(id),
    to_version_id uuid REFERENCES public.configuration_versions(id),
    change_type TEXT CHECK (change_type IN ('create','activate','rollback','delete')),
    changed_by uuid,
    changed_at TIMESTAMPTZ DEFAULT now(),
    reason TEXT
);

COMMIT;
