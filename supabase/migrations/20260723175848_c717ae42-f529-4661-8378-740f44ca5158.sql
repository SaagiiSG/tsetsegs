
ALTER TABLE public.bluebook_modules
  ADD COLUMN IF NOT EXISTS reference_pdf_path text,
  ADD COLUMN IF NOT EXISTS reference_pdf_name text,
  ADD COLUMN IF NOT EXISTS reference_pdf_uploaded_at timestamptz;

DROP POLICY IF EXISTS "Admins read module pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins insert module pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins update module pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete module pdfs" ON storage.objects;

CREATE POLICY "Admins read module pdfs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'module-pdfs' AND public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Admins insert module pdfs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'module-pdfs' AND public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Admins update module pdfs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'module-pdfs' AND public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (bucket_id = 'module-pdfs' AND public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Admins delete module pdfs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'module-pdfs' AND public.has_role(auth.uid(),'admin'::public.app_role));
