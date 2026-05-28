
CREATE OR REPLACE FUNCTION public.get_calibration_accuracy(_student_account_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH first_questions AS (
    SELECT DISTINCT ON (question_id) question_id, is_correct, attempted_at
    FROM public.student_attempts
    WHERE student_account_id = _student_account_id
    ORDER BY question_id, attempted_at ASC
  ),
  first_44 AS (
    SELECT is_correct
    FROM first_questions
    ORDER BY attempted_at ASC
    LIMIT 44
  )
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND((SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric), 4)
  END
  FROM first_44;
$$;

GRANT EXECUTE ON FUNCTION public.get_calibration_accuracy(uuid) TO authenticated, anon, service_role;

ALTER TABLE public.student_accounts
  ADD COLUMN IF NOT EXISTS email_link_prompted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.student_email_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id uuid NOT NULL UNIQUE REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  email text NOT NULL,
  google_sub text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_email_links_email_lower
  ON public.student_email_links (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_email_links TO authenticated;
GRANT SELECT ON public.student_email_links TO anon;
GRANT ALL ON public.student_email_links TO service_role;

ALTER TABLE public.student_email_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read email links"
  ON public.student_email_links FOR SELECT USING (true);

CREATE POLICY "Admins and teachers manage email links"
  ON public.student_email_links FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER trg_student_email_links_updated_at
  BEFORE UPDATE ON public.student_email_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  audience_batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  audience_tier text,
  send_email boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcements_audience_chk CHECK (audience IN ('all','batch','tier'))
);

CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON public.announcements (published_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;
GRANT ALL ON public.announcements TO service_role;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published announcements"
  ON public.announcements FOR SELECT USING (published_at IS NOT NULL);

CREATE POLICY "Staff read all announcements"
  ON public.announcements FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Staff manage announcements"
  ON public.announcements FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.announcement_reads (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, student_account_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_student
  ON public.announcement_reads (student_account_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_reads TO authenticated;
GRANT SELECT, INSERT ON public.announcement_reads TO anon;
GRANT ALL ON public.announcement_reads TO service_role;

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read announcement reads"
  ON public.announcement_reads FOR SELECT USING (true);

CREATE POLICY "Anyone can insert announcement reads"
  ON public.announcement_reads FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff manage announcement reads"
  ON public.announcement_reads FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));
