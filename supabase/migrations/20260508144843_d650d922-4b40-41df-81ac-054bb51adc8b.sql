ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS switched_acknowledged boolean NOT NULL DEFAULT false;