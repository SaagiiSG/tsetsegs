-- Allow teachers to update their own profile (last_login and temporary_password only)
CREATE POLICY "Teachers can update their own profile"
ON public.teachers
FOR UPDATE
USING (
  username = get_current_teacher_username()
)
WITH CHECK (
  username = get_current_teacher_username()
);