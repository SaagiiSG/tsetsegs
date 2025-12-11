-- Add share token column to student_accounts table
ALTER TABLE public.student_accounts 
ADD COLUMN share_token text UNIQUE DEFAULT NULL,
ADD COLUMN share_token_created_at timestamp with time zone DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX idx_student_accounts_share_token ON public.student_accounts(share_token);

-- Create a function to generate a share token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$;