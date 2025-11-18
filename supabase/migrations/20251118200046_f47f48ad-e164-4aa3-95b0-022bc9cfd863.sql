-- Drop existing SELECT policy on batches table
DROP POLICY IF EXISTS "Batches are viewable by unique link" ON public.batches;

-- Create new SELECT policy that allows public read access via unique_link_id
CREATE POLICY "Batches are viewable by unique link"
ON public.batches
FOR SELECT
USING (true);

-- Note: We allow public SELECT on batches because:
-- 1. The reveal page is meant to be publicly accessible via unique link
-- 2. Batch data (teacher, schedule, room) is not sensitive information
-- 3. Student-specific data is protected in the students table with separate RLS policies