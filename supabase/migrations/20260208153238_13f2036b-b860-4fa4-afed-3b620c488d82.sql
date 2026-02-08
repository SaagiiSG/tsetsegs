-- Create table for CB import review sessions
CREATE TABLE public.cb_import_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  total_pages INTEGER NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing errors and skipped pages
CREATE TABLE public.cb_import_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.cb_import_sessions(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('error', 'skipped', 'empty_options')),
  error_message TEXT,
  skip_reason TEXT,
  raw_data JSONB,
  page_image_url TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cb_import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cb_import_issues ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "Admins can manage import sessions" ON public.cb_import_sessions
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage import issues" ON public.cb_import_issues
  FOR ALL USING (has_role(auth.uid(), 'admin'));