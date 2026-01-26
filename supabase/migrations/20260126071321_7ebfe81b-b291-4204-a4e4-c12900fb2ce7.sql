-- Allow teachers to insert registration codes
CREATE POLICY "Teachers can insert registration codes"
ON public.registration_codes
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'teacher'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow teachers to update registration codes (to deactivate old ones)
CREATE POLICY "Teachers can update registration codes"
ON public.registration_codes
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'teacher'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'teacher'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow teachers to read registration codes
CREATE POLICY "Teachers can read registration codes"
ON public.registration_codes
FOR SELECT
USING (
  public.has_role(auth.uid(), 'teacher'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);