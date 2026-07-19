CREATE TABLE public.teaching_checklist_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  batch_id uuid NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX teaching_checklist_progress_unique
  ON public.teaching_checklist_progress (teacher_id, COALESCE(batch_id, '00000000-0000-0000-0000-000000000000'::uuid), item_key);

CREATE INDEX teaching_checklist_progress_teacher_batch
  ON public.teaching_checklist_progress (teacher_id, batch_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teaching_checklist_progress TO authenticated;
GRANT ALL ON public.teaching_checklist_progress TO service_role;

ALTER TABLE public.teaching_checklist_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own checklist progress"
  ON public.teaching_checklist_progress
  FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_teaching_checklist_progress_updated_at
  BEFORE UPDATE ON public.teaching_checklist_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.teaching_checklist_progress;
ALTER TABLE public.teaching_checklist_progress REPLICA IDENTITY FULL;