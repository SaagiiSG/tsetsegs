-- Add authentication fields to teachers table
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash text,
ADD COLUMN IF NOT EXISTS temporary_password boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;

-- Create attendance tracking table
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  session_1 boolean DEFAULT false,
  session_2 boolean DEFAULT false,
  session_3 boolean DEFAULT false,
  session_4 boolean DEFAULT false,
  session_5 boolean DEFAULT false,
  session_6 boolean DEFAULT false,
  session_7 boolean DEFAULT false,
  session_8 boolean DEFAULT false,
  session_9 boolean DEFAULT false,
  session_10 boolean DEFAULT false,
  session_11 boolean DEFAULT false,
  session_12 boolean DEFAULT false,
  session_13 boolean DEFAULT false,
  session_14 boolean DEFAULT false,
  session_15 boolean DEFAULT false,
  total_attended integer GENERATED ALWAYS AS (
    (CASE WHEN session_1 THEN 1 ELSE 0 END) +
    (CASE WHEN session_2 THEN 1 ELSE 0 END) +
    (CASE WHEN session_3 THEN 1 ELSE 0 END) +
    (CASE WHEN session_4 THEN 1 ELSE 0 END) +
    (CASE WHEN session_5 THEN 1 ELSE 0 END) +
    (CASE WHEN session_6 THEN 1 ELSE 0 END) +
    (CASE WHEN session_7 THEN 1 ELSE 0 END) +
    (CASE WHEN session_8 THEN 1 ELSE 0 END) +
    (CASE WHEN session_9 THEN 1 ELSE 0 END) +
    (CASE WHEN session_10 THEN 1 ELSE 0 END) +
    (CASE WHEN session_11 THEN 1 ELSE 0 END) +
    (CASE WHEN session_12 THEN 1 ELSE 0 END) +
    (CASE WHEN session_13 THEN 1 ELSE 0 END) +
    (CASE WHEN session_14 THEN 1 ELSE 0 END) +
    (CASE WHEN session_15 THEN 1 ELSE 0 END)
  ) STORED,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(student_id, batch_id)
);

-- Enable RLS on attendance table
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance
CREATE POLICY "Teachers can view attendance for their batches"
ON public.attendance
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.batches b
    INNER JOIN public.teachers t ON b.teacher = t.name
    WHERE b.id = attendance.batch_id
    AND t.username = (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Teachers can update attendance for their batches"
ON public.attendance
FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.batches b
    INNER JOIN public.teachers t ON b.teacher = t.name
    WHERE b.id = attendance.batch_id
    AND t.username = (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Teachers can insert attendance for their batches"
ON public.attendance
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.batches b
    INNER JOIN public.teachers t ON b.teacher = t.name
    WHERE b.id = attendance.batch_id
    AND t.username = (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Admins can manage all attendance"
ON public.attendance
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update trigger for attendance
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION update_attendance_updated_at();

-- RLS policies for teachers to view their own batches
CREATE POLICY "Teachers can view their own batches"
ON public.batches
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND teacher = (
    SELECT name FROM public.teachers 
    WHERE username = (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = auth.uid())
  )
);

-- RLS policies for teachers to view students in their batches
CREATE POLICY "Teachers can view students in their batches"
ON public.students
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.batches b
    INNER JOIN public.teachers t ON b.teacher = t.name
    WHERE b.id = students.batch_id
    AND t.username = (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Teachers can update students in their batches"
ON public.students
FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.batches b
    INNER JOIN public.teachers t ON b.teacher = t.name
    WHERE b.id = students.batch_id
    AND t.username = (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Teachers can insert students in their batches"
ON public.students
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.batches b
    INNER JOIN public.teachers t ON b.teacher = t.name
    WHERE b.id = students.batch_id
    AND t.username = (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = auth.uid())
  )
);