-- Allow public to read teacher names for registration dropdown
CREATE POLICY "Public can view teacher names"
ON public.teachers
FOR SELECT
USING (true);