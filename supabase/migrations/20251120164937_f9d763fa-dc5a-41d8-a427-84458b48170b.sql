-- Drop the problematic policy
DROP POLICY IF EXISTS "Teachers can view their own profile" ON public.teachers;

-- Create a secure function to get current teacher username
CREATE OR REPLACE FUNCTION public.get_current_teacher_username()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT raw_user_meta_data->>'username'
  FROM auth.users
  WHERE id = auth.uid();
$$;

-- Recreate the policy using the secure function
CREATE POLICY "Teachers can view their own profile"
ON public.teachers
FOR SELECT
USING (
  username = get_current_teacher_username()
);