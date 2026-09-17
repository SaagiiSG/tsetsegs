CREATE TABLE IF NOT EXISTS public.bluebook_video_cache (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.bluebook_video_cache TO service_role;
ALTER TABLE public.bluebook_video_cache ENABLE ROW LEVEL SECURITY;