SET lock_timeout = '3s';

CREATE INDEX IF NOT EXISTS tenant_attempts_institution_created_idx ON public.tenant_attempts (institution_id, created_at);

CREATE INDEX IF NOT EXISTS tenant_speed_runs_institution_created_idx ON public.tenant_speed_runs (institution_id, created_at);
