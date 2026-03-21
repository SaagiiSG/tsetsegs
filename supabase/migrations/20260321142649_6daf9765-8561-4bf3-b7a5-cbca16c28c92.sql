
-- Drop the restrictive public insert policy
DROP POLICY "Public can insert review students" ON public.students;

-- Create a new policy that allows public insert for both review students AND QR onboarding
CREATE POLICY "Public can insert students via registration"
ON public.students
FOR INSERT
WITH CHECK (
  (is_review_student = true AND batch_id IS NULL)
  OR
  (batch_id IS NOT NULL)
);
