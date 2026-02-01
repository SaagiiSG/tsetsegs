-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Add password_hash column to student_accounts for password-based authentication
ALTER TABLE public.student_accounts 
ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT NULL;

-- Add password_set_at timestamp to track when password was set
ALTER TABLE public.student_accounts 
ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create a hash password function using pgcrypto
CREATE OR REPLACE FUNCTION public.hash_student_password(password TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
  SELECT crypt(password, gen_salt('bf', 10));
$$;

-- Create a verify password function
CREATE OR REPLACE FUNCTION public.verify_student_password(stored_hash TEXT, input_password TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
  SELECT stored_hash = crypt(input_password, stored_hash);
$$;