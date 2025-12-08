-- Question Bank & Practice System Schema

-- Add 'student' to app_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE app_role ADD VALUE 'student';
  END IF;
END $$;

-- Student accounts table (extends existing students or creates new practice students)
CREATE TABLE IF NOT EXISTS public.student_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Student sessions for device management
CREATE TABLE IF NOT EXISTS public.student_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id UUID REFERENCES public.student_accounts(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  login_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '5 weeks') NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  user_agent TEXT,
  UNIQUE(student_account_id, device_id)
);

-- Question categories
CREATE TABLE IF NOT EXISTS public.question_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert default categories
INSERT INTO public.question_categories (name) VALUES 
  ('Algebra'),
  ('Geometry'),
  ('Statistics'),
  ('Reading Comprehension'),
  ('Grammar/Writing')
ON CONFLICT (name) DO NOTHING;

-- Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT UNIQUE NOT NULL, -- e.g., "6801"
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  category_id UUID REFERENCES public.question_categories(id),
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'fill_blank')),
  answer TEXT NOT NULL, -- "A"/"B"/"C"/"D" or actual answer
  multiple_choice_options JSONB, -- {A: "", B: "", C: "", D: ""}
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_original BOOLEAN DEFAULT true NOT NULL, -- true for the 68 original questions
  parent_question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL
);

-- AI variations pending review
CREATE TABLE IF NOT EXISTS public.ai_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  answer TEXT NOT NULL,
  multiple_choice_options JSONB,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Student progress tracking
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id UUID REFERENCES public.student_accounts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  video_watched BOOLEAN DEFAULT false NOT NULL,
  video_watched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(student_account_id, question_id)
);

-- Student attempts on variations
CREATE TABLE IF NOT EXISTS public.student_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id UUID REFERENCES public.student_accounts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  answer_submitted TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(student_account_id, question_id, attempt_number)
);

-- Question flags from students
CREATE TABLE IF NOT EXISTS public.question_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  student_account_id UUID REFERENCES public.student_accounts(id) ON DELETE CASCADE NOT NULL,
  flag_reason TEXT,
  flagged_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  admin_reviewed BOOLEAN DEFAULT false NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(question_id, student_account_id)
);

-- Enable RLS on all tables
ALTER TABLE public.student_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Student accounts: admins full access
CREATE POLICY "Admins can manage student accounts" ON public.student_accounts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Student sessions: admins full access
CREATE POLICY "Admins can manage student sessions" ON public.student_sessions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Question categories: admins full access, teachers/students can view
CREATE POLICY "Admins can manage question categories" ON public.question_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view question categories" ON public.question_categories
  FOR SELECT USING (true);

-- Questions: admins full access, public read for active questions
CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active questions" ON public.questions
  FOR SELECT USING (is_active = true);

-- AI variations: admins only
CREATE POLICY "Admins can manage ai variations" ON public.ai_variations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Student progress: admins full access
CREATE POLICY "Admins can manage student progress" ON public.student_progress
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Student attempts: admins full access
CREATE POLICY "Admins can manage student attempts" ON public.student_attempts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Question flags: admins full access
CREATE POLICY "Admins can manage question flags" ON public.question_flags
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_parent ON public.questions(parent_question_id);
CREATE INDEX IF NOT EXISTS idx_questions_question_id ON public.questions(question_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON public.student_progress(student_account_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_student ON public.student_attempts(student_account_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_student ON public.student_sessions(student_account_id);

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for question images
CREATE POLICY "Admins can upload question images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'question-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update question images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'question-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete question images" ON storage.objects
  FOR DELETE USING (bucket_id = 'question-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view question images" ON storage.objects
  FOR SELECT USING (bucket_id = 'question-images');