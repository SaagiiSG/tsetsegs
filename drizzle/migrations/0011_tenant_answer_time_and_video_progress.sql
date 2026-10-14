ALTER TABLE public.tenant_attempts ADD COLUMN IF NOT EXISTS time_spent_seconds integer;

CREATE TABLE public.tenant_video_progress (
  student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.concept_videos(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_video_progress TO authenticated;
GRANT ALL ON public.tenant_video_progress TO service_role;
ALTER TABLE public.tenant_video_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own video progress" ON public.tenant_video_progress FOR SELECT TO authenticated USING (student_id = public.tenant_my_student_id(institution_id));
CREATE POLICY "Students record own video progress" ON public.tenant_video_progress FOR INSERT TO authenticated WITH CHECK (student_id = public.tenant_my_student_id(institution_id));
CREATE POLICY "Center staff view video progress" ON public.tenant_video_progress FOR SELECT TO authenticated USING (public.tenant_has_role(institution_id, 'teacher'));