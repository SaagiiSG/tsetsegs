-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for admin authentication
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles - only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create teachers table
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on teachers
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Admins can manage teachers
CREATE POLICY "Admins can manage teachers"
ON public.teachers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add batch_name to batches table
ALTER TABLE public.batches ADD COLUMN batch_name TEXT;

-- Add new columns for teacher and room as text
ALTER TABLE public.batches ADD COLUMN teacher_name TEXT;
ALTER TABLE public.batches ADD COLUMN room_name TEXT;

-- Copy existing data to new columns
UPDATE public.batches SET teacher_name = teacher::text;
UPDATE public.batches SET room_name = room::text;

-- Drop old columns
ALTER TABLE public.batches DROP COLUMN teacher;
ALTER TABLE public.batches DROP COLUMN room;

-- Rename new columns to match expected names
ALTER TABLE public.batches RENAME COLUMN teacher_name TO teacher;
ALTER TABLE public.batches RENAME COLUMN room_name TO room;

-- Update batches RLS - only admins can manage
DROP POLICY IF EXISTS "Allow all access to batches" ON public.batches;
CREATE POLICY "Admins can manage batches"
ON public.batches
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can view batches by unique link (for student reveal)
CREATE POLICY "Anyone can view batch by unique link"
ON public.batches
FOR SELECT
TO anon
USING (true);

-- Update students RLS - only admins can manage
DROP POLICY IF EXISTS "Allow all access to students" ON public.students;
CREATE POLICY "Admins can manage students"
ON public.students
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can view students by unique link (for student reveal)
CREATE POLICY "Anyone can view student by unique link"
ON public.students
FOR SELECT
TO anon
USING (true);

-- Anyone can update student accessed status
CREATE POLICY "Anyone can update student accessed status"
ON public.students
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Insert initial teachers
INSERT INTO public.teachers (name, phone) VALUES
  ('Saran-Ochir', '+976-0000-0000'),
  ('Altan-Erdene', '+976-0000-0001'),
  ('Manlai', '+976-0000-0002');