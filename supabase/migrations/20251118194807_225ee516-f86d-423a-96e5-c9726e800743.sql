-- Create a function to get all users (admin only)
-- This allows admins to view all registered users for role management

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    au.id,
    au.email,
    au.created_at
  FROM auth.users au
  WHERE has_role(auth.uid(), 'admin'::app_role)
  ORDER BY au.created_at DESC;
$$;

-- Add SELECT policy for user_roles (so admins can see who has what role)
CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));