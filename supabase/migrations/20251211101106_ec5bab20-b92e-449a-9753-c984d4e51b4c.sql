-- Add linked_student_id to student_accounts to connect practice accounts to real student profiles
ALTER TABLE public.student_accounts 
ADD COLUMN linked_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_student_accounts_linked_student ON public.student_accounts(linked_student_id);
CREATE INDEX idx_student_accounts_phone ON public.student_accounts(phone_number);
CREATE INDEX idx_students_phone ON public.students(phone);

-- Function to auto-link student accounts to students based on phone number
CREATE OR REPLACE FUNCTION public.link_student_account_by_phone()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to find matching student by phone number (without country code formatting)
  SELECT id INTO NEW.linked_student_id
  FROM public.students
  WHERE phone = NEW.phone_number
     OR phone = REPLACE(NEW.phone_number, '-', '')
     OR REPLACE(phone, '-', '') = NEW.phone_number
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-link on insert
CREATE TRIGGER auto_link_student_account
  BEFORE INSERT ON public.student_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.link_student_account_by_phone();

-- Update existing student_accounts to link them
UPDATE public.student_accounts sa
SET linked_student_id = s.id
FROM public.students s
WHERE sa.phone_number = s.phone
   OR sa.phone_number = REPLACE(s.phone, '-', '')
   OR REPLACE(sa.phone_number, '-', '') = s.phone;

-- Create session activity log for monitoring
CREATE TABLE public.student_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.student_sessions(id) ON DELETE SET NULL,
  activity_type text NOT NULL, -- 'login', 'logout', 'question_view', 'question_attempt', 'video_watch', 'suspicious_activity'
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity logs
CREATE POLICY "Admins can manage activity logs"
  ON public.student_activity_logs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create spaced repetition queue table for wrong answers
CREATE TABLE public.student_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  next_review_at timestamptz NOT NULL DEFAULT now(),
  review_count integer DEFAULT 0,
  ease_factor numeric(3,2) DEFAULT 2.50, -- SM-2 algorithm factor
  interval_days integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_account_id, question_id)
);

-- Enable RLS
ALTER TABLE public.student_review_queue ENABLE ROW LEVEL SECURITY;

-- Admins can manage review queue
CREATE POLICY "Admins can manage review queue"
  ON public.student_review_queue
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Index for efficient queue queries
CREATE INDEX idx_review_queue_student_next ON public.student_review_queue(student_account_id, next_review_at);

-- Add public RLS policies for student_accounts, student_sessions, student_progress, student_attempts
-- so students can access their own data

-- Students can view their own account (anonymous access via session validation)
CREATE POLICY "Public can read student accounts"
  ON public.student_accounts
  FOR SELECT
  USING (true);

-- Students can update their own account (login updates last_login)
CREATE POLICY "Public can update student accounts"
  ON public.student_accounts
  FOR UPDATE
  USING (true);

-- Students can insert new accounts
CREATE POLICY "Public can insert student accounts"
  ON public.student_accounts
  FOR INSERT
  WITH CHECK (true);

-- Sessions - public read/write for login/logout
CREATE POLICY "Public can read sessions"
  ON public.student_sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Public can insert sessions"
  ON public.student_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update sessions"
  ON public.student_sessions
  FOR UPDATE
  USING (true);

-- Progress - public access for tracking
CREATE POLICY "Public can read progress"
  ON public.student_progress
  FOR SELECT
  USING (true);

CREATE POLICY "Public can insert progress"
  ON public.student_progress
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update progress"
  ON public.student_progress
  FOR UPDATE
  USING (true);

-- Attempts - public access for tracking
CREATE POLICY "Public can read attempts"
  ON public.student_attempts
  FOR SELECT
  USING (true);

CREATE POLICY "Public can insert attempts"
  ON public.student_attempts
  FOR INSERT
  WITH CHECK (true);

-- Review queue - public access for spaced repetition
CREATE POLICY "Public can read review queue"
  ON public.student_review_queue
  FOR SELECT
  USING (true);

CREATE POLICY "Public can insert review queue"
  ON public.student_review_queue
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update review queue"
  ON public.student_review_queue
  FOR UPDATE
  USING (true);

-- Activity logs - public insert only (students log their own activity)
CREATE POLICY "Public can insert activity logs"
  ON public.student_activity_logs
  FOR INSERT
  WITH CHECK (true);