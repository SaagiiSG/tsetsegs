ALTER TABLE public.intl_questions ADD COLUMN IF NOT EXISTS ext_variant boolean NOT NULL DEFAULT false;
ALTER TABLE public.intl_questions ADD COLUMN IF NOT EXISTS ext_question_id text;
CREATE INDEX IF NOT EXISTS intl_questions_ext_variant_idx ON public.intl_questions(ext_variant) WHERE ext_variant;