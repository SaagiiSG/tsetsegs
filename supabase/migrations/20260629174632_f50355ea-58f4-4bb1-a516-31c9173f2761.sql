ALTER TABLE public.student_accounts
  ADD COLUMN IF NOT EXISTS daily_goal_speed   integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS daily_goal_hard    integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS daily_goal_medium  integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS goal_intensity     text,
  ADD COLUMN IF NOT EXISTS daily_goal_set_at  timestamptz;