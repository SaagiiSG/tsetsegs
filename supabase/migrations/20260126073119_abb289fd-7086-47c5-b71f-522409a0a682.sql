-- Create intense_prep_groups table
CREATE TABLE public.intense_prep_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by_teacher_id uuid REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.intense_prep_groups ENABLE ROW LEVEL SECURITY;

-- Create intense_prep_members table
CREATE TABLE public.intense_prep_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.intense_prep_groups(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  manual_name text,
  manual_phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intense_prep_members ENABLE ROW LEVEL SECURITY;

-- Create intense_prep_tracking table
CREATE TABLE public.intense_prep_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.intense_prep_members(id) ON DELETE CASCADE NOT NULL UNIQUE,
  problems_68_solved boolean[] DEFAULT ARRAY[]::boolean[],
  problems_68_notes boolean[] DEFAULT ARRAY[]::boolean[],
  practice_test_scores jsonb DEFAULT '{}'::jsonb,
  prep_session_notes integer DEFAULT 0 CHECK (prep_session_notes >= 0 AND prep_session_notes <= 5),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by text
);

-- Enable RLS
ALTER TABLE public.intense_prep_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for intense_prep_groups
CREATE POLICY "Admins can manage all groups"
ON public.intense_prep_groups
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view their own groups"
ON public.intense_prep_groups
FOR SELECT
USING (
  public.has_role(auth.uid(), 'teacher'::app_role) AND
  created_by_teacher_id IN (
    SELECT id FROM public.teachers WHERE username = public.get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can insert their own groups"
ON public.intense_prep_groups
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'teacher'::app_role) AND
  created_by_teacher_id IN (
    SELECT id FROM public.teachers WHERE username = public.get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can update their own groups"
ON public.intense_prep_groups
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'teacher'::app_role) AND
  created_by_teacher_id IN (
    SELECT id FROM public.teachers WHERE username = public.get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can delete their own groups"
ON public.intense_prep_groups
FOR DELETE
USING (
  public.has_role(auth.uid(), 'teacher'::app_role) AND
  created_by_teacher_id IN (
    SELECT id FROM public.teachers WHERE username = public.get_current_teacher_username()
  )
);

-- RLS Policies for intense_prep_members
CREATE POLICY "Admins can manage all members"
ON public.intense_prep_members
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view members in their groups"
ON public.intense_prep_members
FOR SELECT
USING (
  public.has_role(auth.uid(), 'teacher'::app_role) AND
  group_id IN (
    SELECT id FROM public.intense_prep_groups 
    WHERE created_by_teacher_id IN (
      SELECT id FROM public.teachers WHERE username = public.get_current_teacher_username()
    )
  )
);

CREATE POLICY "Teachers can insert members in their groups"
ON public.intense_prep_members
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'teacher'::app_role) AND
  group_id IN (
    SELECT id FROM public.intense_prep_groups 
    WHERE created_by_teacher_id IN (
      SELECT id FROM public.teachers WHERE username = public.get_current_teacher_username()
    )
  )
);

CREATE POLICY "Teachers can update members in their groups"
ON public.intense_prep_members
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'teacher'::app_role) AND
  group_id IN (
    SELECT id FROM public.intense_prep_groups 
    WHERE created_by_teacher_id IN (
      SELECT id FROM public.teachers WHERE username = public.get_current_teacher_username()
    )
  )
);

CREATE POLICY "Teachers can delete members in their groups"
ON public.intense_prep_members
FOR DELETE
USING (
  public.has_role(auth.uid(), 'teacher'::app_role) AND
  group_id IN (
    SELECT id FROM public.intense_prep_groups 
    WHERE created_by_teacher_id IN (
      SELECT id FROM public.teachers WHERE username = public.get_current_teacher_username()
    )
  )
);

-- RLS Policies for intense_prep_tracking
CREATE POLICY "Admins can manage all tracking"
ON public.intense_prep_tracking
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view tracking in their groups"
ON public.intense_prep_tracking
FOR SELECT
USING (
  public.has_role(auth.uid(), 'teacher'::app_role) AND
  member_id IN (
    SELECT ipm.id FROM public.intense_prep_members ipm
    JOIN public.intense_prep_groups ipg ON ipm.group_id = ipg.id
    WHERE ipg.created_by_teacher_id IN (
      SELECT id FROM public.teachers WHERE username = public.get_current_teacher_username()
    )
  )
);

CREATE POLICY "Teachers can insert tracking in their groups"
ON public.intense_prep_tracking
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'teacher'::app_role) AND
  member_id IN (
    SELECT ipm.id FROM public.intense_prep_members ipm
    JOIN public.intense_prep_groups ipg ON ipm.group_id = ipg.id
    WHERE ipg.created_by_teacher_id IN (
      SELECT id FROM public.teachers WHERE username = public.get_current_teacher_username()
    )
  )
);

CREATE POLICY "Teachers can update tracking in their groups"
ON public.intense_prep_tracking
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'teacher'::app_role) AND
  member_id IN (
    SELECT ipm.id FROM public.intense_prep_members ipm
    JOIN public.intense_prep_groups ipg ON ipm.group_id = ipg.id
    WHERE ipg.created_by_teacher_id IN (
      SELECT id FROM public.teachers WHERE username = public.get_current_teacher_username()
    )
  )
);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_intense_prep_tracking_updated_at
BEFORE UPDATE ON public.intense_prep_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();