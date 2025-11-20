-- Allow teachers to read their own record
CREATE POLICY "Teachers can view their own profile"
ON public.teachers
FOR SELECT
USING (
  username = (
    SELECT raw_user_meta_data->>'username'
    FROM auth.users
    WHERE id = auth.uid()
  )
);