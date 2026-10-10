CREATE TABLE public.concept_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  domain text NOT NULL DEFAULT 'Algebra',
  module text,
  video_url text NOT NULL,
  duration_minutes integer,
  order_index integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.concept_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concept_videos TO authenticated;
GRANT ALL ON public.concept_videos TO service_role;
ALTER TABLE public.concept_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published concept videos are viewable" ON public.concept_videos FOR SELECT TO anon, authenticated USING (is_published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage concept videos" ON public.concept_videos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX concept_videos_domain_order ON public.concept_videos (domain, order_index);

CREATE POLICY "Concept videos public read" ON storage.objects FOR SELECT USING (bucket_id = 'concept-videos');
CREATE POLICY "Admins upload concept videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'concept-videos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete concept videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'concept-videos' AND public.has_role(auth.uid(), 'admin'));