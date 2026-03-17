
-- Create bug_reports table
CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Students can insert their own bug reports
CREATE POLICY "Students can insert their own bug reports"
ON public.bug_reports
FOR INSERT
WITH CHECK (true);

-- Students can read their own bug reports
CREATE POLICY "Students can read their own bug reports"
ON public.bug_reports
FOR SELECT
USING (true);

-- Admins can manage all bug reports
CREATE POLICY "Admins can manage all bug reports"
ON public.bug_reports
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
