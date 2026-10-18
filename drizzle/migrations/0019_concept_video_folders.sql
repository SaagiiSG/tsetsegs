CREATE TABLE public.concept_video_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.concept_video_folder_items (
  folder_id uuid NOT NULL REFERENCES public.concept_video_folders(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.concept_videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (folder_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concept_video_folders TO authenticated;
GRANT ALL ON public.concept_video_folders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concept_video_folder_items TO authenticated;
GRANT ALL ON public.concept_video_folder_items TO service_role;
ALTER TABLE public.concept_video_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_video_folder_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage video folders" ON public.concept_video_folders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage video folder items" ON public.concept_video_folder_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));