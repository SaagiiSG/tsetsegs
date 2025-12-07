-- Create curriculum templates table (master SAT/IELTS curriculum)
CREATE TABLE public.curriculum_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_type course_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  total_sessions INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create curriculum sessions table (session 1-24 content per template)
CREATE TABLE public.curriculum_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.curriculum_templates(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  objectives TEXT,
  teacher_notes TEXT,
  duration_minutes INTEGER DEFAULT 120,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, session_number)
);

-- Create session topics table (topic breakdowns per session)
CREATE TABLE public.session_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.curriculum_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  resources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create homework assignments table
CREATE TABLE public.homework_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.curriculum_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  submission_type TEXT NOT NULL DEFAULT 'flexible' CHECK (submission_type IN ('digital', 'offline', 'flexible')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  due_session_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create homework questions table (multiple choice + fill in blank)
CREATE TABLE public.homework_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.homework_assignments(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'fill_blank')),
  question_text TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.curriculum_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for curriculum_templates
CREATE POLICY "Admins can manage curriculum templates"
ON public.curriculum_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view active curriculum templates"
ON public.curriculum_templates FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) AND is_active = true);

-- RLS Policies for curriculum_sessions
CREATE POLICY "Admins can manage curriculum sessions"
ON public.curriculum_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view curriculum sessions"
ON public.curriculum_sessions FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role));

-- RLS Policies for session_topics
CREATE POLICY "Admins can manage session topics"
ON public.session_topics FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view session topics"
ON public.session_topics FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role));

-- RLS Policies for homework_assignments
CREATE POLICY "Admins can manage homework assignments"
ON public.homework_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view published homework assignments"
ON public.homework_assignments FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role));

-- RLS Policies for homework_questions
CREATE POLICY "Admins can manage homework questions"
ON public.homework_questions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view homework questions"
ON public.homework_questions FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role));

-- Create indexes for performance
CREATE INDEX idx_curriculum_sessions_template ON public.curriculum_sessions(template_id);
CREATE INDEX idx_session_topics_session ON public.session_topics(session_id);
CREATE INDEX idx_homework_assignments_session ON public.homework_assignments(session_id);
CREATE INDEX idx_homework_questions_assignment ON public.homework_questions(assignment_id);

-- Update timestamp triggers
CREATE TRIGGER update_curriculum_templates_updated_at
BEFORE UPDATE ON public.curriculum_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_curriculum_sessions_updated_at
BEFORE UPDATE ON public.curriculum_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homework_assignments_updated_at
BEFORE UPDATE ON public.homework_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();