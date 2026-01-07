-- Add is_dev_account flag to bypass 30-day device lock
ALTER TABLE public.student_accounts 
ADD COLUMN IF NOT EXISTS is_dev_account boolean DEFAULT false;