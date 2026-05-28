
-- 1) Track when a student has completed calibration (44 distinct questions)
ALTER TABLE public.student_accounts
  ADD COLUMN IF NOT EXISTS rank_unlocked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_student_accounts_rank_unlocked_at
  ON public.student_accounts (rank_unlocked_at);

-- 2) Helper: count distinct questions a student has attempted, and whether
--    they're past the 44-question calibration threshold.
CREATE OR REPLACE FUNCTION public.get_calibration_progress(_student_account_id uuid)
RETURNS TABLE (solved integer, required integer, unlocked boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((
      SELECT COUNT(DISTINCT question_id)::int
      FROM public.student_attempts
      WHERE student_account_id = _student_account_id
    ), 0) AS solved,
    44 AS required,
    EXISTS (
      SELECT 1 FROM public.student_accounts
      WHERE id = _student_account_id AND rank_unlocked_at IS NOT NULL
    ) AS unlocked;
$$;

-- 3) Auto-set rank_unlocked_at the first time a student reaches 44 distinct
--    questions attempted. Runs on each new attempt insert (cheap: only fires
--    when the row is still NULL).
CREATE OR REPLACE FUNCTION public.maybe_unlock_rank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_unlocked timestamptz;
  v_distinct integer;
BEGIN
  SELECT rank_unlocked_at INTO v_already_unlocked
  FROM public.student_accounts
  WHERE id = NEW.student_account_id;

  IF v_already_unlocked IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(DISTINCT question_id) INTO v_distinct
  FROM public.student_attempts
  WHERE student_account_id = NEW.student_account_id;

  IF v_distinct >= 44 THEN
    UPDATE public.student_accounts
      SET rank_unlocked_at = now()
      WHERE id = NEW.student_account_id
        AND rank_unlocked_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maybe_unlock_rank ON public.student_attempts;
CREATE TRIGGER trg_maybe_unlock_rank
AFTER INSERT ON public.student_attempts
FOR EACH ROW
EXECUTE FUNCTION public.maybe_unlock_rank();

-- 4) Backfill: any student who already has >= 44 distinct attempts is unlocked
UPDATE public.student_accounts sa
SET rank_unlocked_at = now()
WHERE rank_unlocked_at IS NULL
  AND (
    SELECT COUNT(DISTINCT question_id)
    FROM public.student_attempts
    WHERE student_account_id = sa.id
  ) >= 44;
