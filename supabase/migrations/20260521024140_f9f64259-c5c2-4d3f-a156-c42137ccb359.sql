
-- 1) Prefer SAT when linking a new student_account
CREATE OR REPLACE FUNCTION public.link_student_account_by_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  SELECT s.id INTO NEW.linked_student_id
  FROM public.students s
  LEFT JOIN public.batches b ON b.id = s.batch_id
  WHERE s.phone = NEW.phone_number
     OR s.phone = REPLACE(NEW.phone_number, '-', '')
     OR REPLACE(s.phone, '-', '') = NEW.phone_number
  ORDER BY
    CASE WHEN b.course_type = 'SAT' THEN 0 ELSE 1 END,
    s.created_at DESC
  LIMIT 1;
  RETURN NEW;
END;
$function$;

-- 2) Backfill existing accounts: prefer SAT student record over IELTS
UPDATE public.student_accounts sa
SET linked_student_id = sub.sat_id
FROM (
  SELECT
    sa2.id AS account_id,
    (
      SELECT s.id
      FROM public.students s
      JOIN public.batches b ON b.id = s.batch_id
      WHERE (s.phone = sa2.phone_number
             OR s.phone = REPLACE(sa2.phone_number, '-', '')
             OR REPLACE(s.phone, '-', '') = sa2.phone_number)
        AND b.course_type = 'SAT'
      ORDER BY s.created_at DESC
      LIMIT 1
    ) AS sat_id,
    sa2.linked_student_id AS current_id
  FROM public.student_accounts sa2
) sub
WHERE sa.id = sub.account_id
  AND sub.sat_id IS NOT NULL
  AND (sa.linked_student_id IS NULL OR sa.linked_student_id <> sub.sat_id)
  AND EXISTS (
    SELECT 1 FROM public.students s2
    JOIN public.batches b2 ON b2.id = s2.batch_id
    WHERE s2.id = sa.linked_student_id
      AND b2.course_type <> 'SAT'
  );

-- 3) Password reset codes table
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prc_account_active
  ON public.password_reset_codes (student_account_id, consumed_at, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_prc_phone_created
  ON public.password_reset_codes (phone_number, created_at DESC);

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- No client policies: only service-role (edge functions) can touch it.
