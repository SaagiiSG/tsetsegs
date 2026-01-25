-- Create registration_codes table for time-limited access codes
CREATE TABLE public.registration_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by_teacher_id uuid REFERENCES public.teachers(id),
  created_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  used_count integer NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;

-- Admins can manage all codes
CREATE POLICY "Admins can manage registration codes"
ON public.registration_codes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can create and view their own codes
CREATE POLICY "Teachers can create registration codes"
ON public.registration_codes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  created_by_teacher_id IN (
    SELECT id FROM public.teachers WHERE username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can view their own codes"
ON public.registration_codes
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  created_by_teacher_id IN (
    SELECT id FROM public.teachers WHERE username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can update their own codes"
ON public.registration_codes
FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  created_by_teacher_id IN (
    SELECT id FROM public.teachers WHERE username = get_current_teacher_username()
  )
);

-- Public can read active, non-expired codes (for validation)
CREATE POLICY "Public can validate codes"
ON public.registration_codes
FOR SELECT
USING (is_active = true AND expires_at > now());

-- Add review_teacher column to students table to track which teacher's review session they joined
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS review_teacher text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_review_student boolean DEFAULT false;