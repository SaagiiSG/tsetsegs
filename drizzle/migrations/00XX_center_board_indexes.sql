-- Center student portal part 1 follow-up:
-- tenant_student_board now runs on every student portal load and after every paid answer. It filters
-- tenant_attempts and tenant_speed_runs by institution_id and created_at (sprint window), and the only
-- existing indexes on those tables lead with student_id (0002, 0008), so give the board its own.
-- Safe to run twice.
SET lock_timeout = '3s';

CREATE INDEX IF NOT EXISTS tenant_attempts_institution_created_idx ON public.tenant_attempts (institution_id, created_at);
CREATE INDEX IF NOT EXISTS tenant_speed_runs_institution_created_idx ON public.tenant_speed_runs (institution_id, created_at);
