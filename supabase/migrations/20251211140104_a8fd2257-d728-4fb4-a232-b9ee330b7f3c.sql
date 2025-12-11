-- Add public read policy for attendance (for shareable student profiles)
CREATE POLICY "Public can read attendance" 
ON public.attendance 
FOR SELECT 
USING (true);

-- Add public read policy for homework (for shareable student profiles)
CREATE POLICY "Public can read homework" 
ON public.homework 
FOR SELECT 
USING (true);

-- Add public read policy for practice_tests (for shareable student profiles)
CREATE POLICY "Public can read practice tests" 
ON public.practice_tests 
FOR SELECT 
USING (true);