-- Allow public to insert students for registration (with code validation done in app)
CREATE POLICY "Public can insert review students"
ON public.students
FOR INSERT
WITH CHECK (is_review_student = true AND batch_id IS NULL);