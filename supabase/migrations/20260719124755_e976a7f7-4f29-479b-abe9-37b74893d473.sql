ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS parent_phone text,
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS math_level text,
  ADD COLUMN IF NOT EXISTS english_level text,
  ADD COLUMN IF NOT EXISTS has_taken_test boolean,
  ADD COLUMN IF NOT EXISTS previous_score integer,
  ADD COLUMN IF NOT EXISTS planned_test_date text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_requests TO authenticated;
GRANT SELECT, INSERT ON public.registration_requests TO anon;
GRANT ALL ON public.registration_requests TO service_role;